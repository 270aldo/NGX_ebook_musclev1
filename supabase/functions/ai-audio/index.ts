import { TTS_MODEL } from '../_shared/config.ts';
import { adminClient } from '../_shared/db.ts';
import { preflightResponse, jsonResponse } from '../_shared/cors.ts';
import { resolveIdentity } from '../_shared/identity.ts';
import { buildRequestId, getIdempotentResponse, saveIdempotentResponse } from '../_shared/idempotency.ts';
import {
  commitLedger,
  getEffectivePriceCredits,
  reserveDemoCredits,
  reserveUserCredits,
  rollbackLedger,
} from '../_shared/pricing.ts';
import { callGeminiAudio, estimateTextUsd } from '../_shared/gemini.ts';

interface AudioRequest {
  text: string;
  idempotencyKey: string;
  conversationId?: string;
  voiceName?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return preflightResponse();
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const body = (await req.json()) as Partial<AudioRequest>;
    const text = String(body.text ?? '').trim();
    const idempotencyKey = String(body.idempotencyKey ?? '').trim();

    if (!text) {
      return jsonResponse(400, { error: 'EMPTY_TEXT' });
    }

    if (!idempotencyKey) {
      return jsonResponse(400, { error: 'MISSING_IDEMPOTENCY_KEY' });
    }

    const identity = await resolveIdentity(req, adminClient);
    const endpoint = 'ai-audio';

    const cached = await getIdempotentResponse(adminClient, endpoint, identity.scopeKey, idempotencyKey);
    if (cached) {
      return jsonResponse(200, {
        ...cached,
        idempotentReplay: true,
      });
    }

    const creditsToCharge = await getEffectivePriceCredits(adminClient, 'chat', 'mentor', 'stable');
    const requestId = buildRequestId(endpoint, identity.scopeKey, idempotencyKey);

    const reserveResult = identity.userId
      ? await reserveUserCredits(adminClient, {
          userId: identity.userId,
          requestId,
          operation: 'chat',
          mode: 'mentor',
          model: TTS_MODEL,
          modelTier: 'stable',
          credits: creditsToCharge,
          metadata: {
            feature: 'bonus_ebook',
            conversationId: body.conversationId ?? null,
            type: 'audio',
          },
        })
      : await reserveDemoCredits(adminClient, {
          deviceFingerprint: identity.deviceFingerprint,
          requestId,
          operation: 'chat',
          mode: 'mentor',
          model: TTS_MODEL,
          modelTier: 'stable',
          credits: creditsToCharge,
          isImage: false,
          metadata: {
            feature: 'bonus_ebook',
            conversationId: body.conversationId ?? null,
            type: 'audio',
          },
        });

    if (!reserveResult.success) {
      return jsonResponse(402, {
        error: reserveResult.errorCode ?? 'INSUFFICIENT_CREDITS',
        creditsRemaining: reserveResult.creditsRemaining,
      });
    }

    try {
      const audioResult = await callGeminiAudio({
        model: TTS_MODEL,
        text,
        voiceName: body.voiceName,
      });

      const usdEstimate = estimateTextUsd(
        TTS_MODEL,
        audioResult.usage.promptTokenCount,
        audioResult.usage.candidatesTokenCount,
      );

      await commitLedger(adminClient, {
        requestId,
        tokensIn: audioResult.usage.promptTokenCount,
        tokensOut: audioResult.usage.candidatesTokenCount,
        groundedQueries: 0,
        imageCount: 0,
        usdEstimate,
        metadata: {
          type: 'audio',
          voiceName: body.voiceName ?? 'Kore',
        },
      });

      const response: Record<string, unknown> = {
        audioBase64: audioResult.audioBase64,
        mimeType: audioResult.mimeType,
        usage: {
          inputTokens: audioResult.usage.promptTokenCount,
          outputTokens: audioResult.usage.candidatesTokenCount,
          totalTokens: audioResult.usage.totalTokenCount,
        },
        creditsCharged: creditsToCharge,
        creditsRemaining: reserveResult.creditsRemaining,
        modelUsed: TTS_MODEL,
      };

      await saveIdempotentResponse(adminClient, endpoint, identity.scopeKey, idempotencyKey, response);

      return jsonResponse(200, response);
    } catch (error) {
      await rollbackLedger(adminClient, requestId, 'GEMINI_AUDIO_ERROR');
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return jsonResponse(500, {
      error: 'AI_AUDIO_FAILED',
      message,
    });
  }
});
