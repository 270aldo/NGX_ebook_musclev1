import { adminClient } from '../_shared/db.ts';
import { preflightResponse, jsonResponse } from '../_shared/cors.ts';
import { resolveIdentity } from '../_shared/identity.ts';
import { buildRequestId, getIdempotentResponse, saveIdempotentResponse } from '../_shared/idempotency.ts';
import {
  commitLedger,
  getEffectivePriceCredits,
  getOrCreateDemoSession,
  getUsageLimits,
  getUserBudgetStatus,
  getWeeklyImageUsage,
  reserveDemoCredits,
  reserveUserCredits,
  rollbackLedger,
} from '../_shared/pricing.ts';
import { callGeminiImage, estimateImageUsd, getImageModel } from '../_shared/gemini.ts';

type ImageQuality = 'standard' | 'high_quality';

interface ImageRequest {
  prompt: string;
  conversationId?: string;
  isDemo?: boolean;
  idempotencyKey: string;
  quality?: ImageQuality;
}

const isQuality = (value: unknown): value is ImageQuality => {
  return value === 'standard' || value === 'high_quality';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return preflightResponse();
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const body = (await req.json()) as Partial<ImageRequest>;
    const prompt = String(body.prompt ?? '').trim();
    if (!prompt) {
      return jsonResponse(400, { error: 'EMPTY_PROMPT' });
    }

    const idempotencyKey = String(body.idempotencyKey ?? '').trim();
    if (!idempotencyKey) {
      return jsonResponse(400, { error: 'MISSING_IDEMPOTENCY_KEY' });
    }

    const quality: ImageQuality = isQuality(body.quality) ? body.quality : 'standard';

    const identity = await resolveIdentity(req, adminClient);
    const endpoint = 'ai-image';

    const cached = await getIdempotentResponse(adminClient, endpoint, identity.scopeKey, idempotencyKey);
    if (cached) {
      return jsonResponse(200, {
        ...cached,
        idempotentReplay: true,
      });
    }

    const usageLimits = await getUsageLimits(adminClient);
    const model = getImageModel(quality);
    const creditsToCharge = await getEffectivePriceCredits(adminClient, 'image', 'visionary', quality);

    if (identity.userId) {
      const budget = await getUserBudgetStatus(adminClient, identity.userId);
      if (!budget.withinCap) {
        return jsonResponse(403, {
          error: 'SOFT_CAP_REACHED_IMAGE_BLOCKED',
          creditsRemaining: null,
        });
      }

      const weeklyImageUsage = await getWeeklyImageUsage(adminClient, identity.userId);
      if (weeklyImageUsage >= usageLimits.weeklyImages) {
        return jsonResponse(429, {
          error: 'WEEKLY_IMAGE_LIMIT_REACHED',
          weeklyImageLimit: usageLimits.weeklyImages,
          imageQuotaRemaining: 0,
        });
      }
    }

    const requestId = buildRequestId(endpoint, identity.scopeKey, idempotencyKey);

    let reserveResult;
    if (identity.userId) {
      reserveResult = await reserveUserCredits(adminClient, {
        userId: identity.userId,
        requestId,
        operation: 'image',
        mode: 'visionary',
        model,
        modelTier: quality,
        credits: creditsToCharge,
        metadata: {
          feature: 'bonus_ebook',
          conversationId: body.conversationId ?? null,
          quality,
        },
      });
    } else {
      reserveResult = await reserveDemoCredits(adminClient, {
        deviceFingerprint: identity.deviceFingerprint,
        requestId,
        operation: 'image',
        mode: 'visionary',
        model,
        modelTier: quality,
        credits: creditsToCharge,
        isImage: true,
        metadata: {
          feature: 'bonus_ebook',
          conversationId: body.conversationId ?? null,
          quality,
        },
      });
    }

    if (!reserveResult.success) {
      return jsonResponse(402, {
        error: reserveResult.errorCode ?? 'INSUFFICIENT_CREDITS',
        creditsRemaining: reserveResult.creditsRemaining,
        imageQuotaRemaining: reserveResult.imagesRemaining ?? null,
        isDemo: identity.isDemo,
      });
    }

    try {
      const imageResult = await callGeminiImage({
        model,
        prompt,
      });

      const usdEstimate = estimateImageUsd(model, quality);

      await commitLedger(adminClient, {
        requestId,
        tokensIn: imageResult.usage.promptTokenCount,
        tokensOut: imageResult.usage.candidatesTokenCount,
        groundedQueries: 0,
        imageCount: 1,
        usdEstimate,
        metadata: {
          quality,
        },
      });

      const response: Record<string, unknown> = {
        imageUrlOrBase64: imageResult.imageDataUrl,
        usage: {
          inputTokens: imageResult.usage.promptTokenCount,
          outputTokens: imageResult.usage.candidatesTokenCount,
          totalTokens: imageResult.usage.totalTokenCount,
          imageCount: 1,
        },
        creditsCharged: identity.isDemo ? 0 : creditsToCharge,
        creditsRemaining: reserveResult.creditsRemaining,
        imageQuotaRemaining: reserveResult.imagesRemaining ?? null,
        modelUsed: model,
        modeUsed: 'visionary',
        isDemo: identity.isDemo,
      };

      await saveIdempotentResponse(adminClient, endpoint, identity.scopeKey, idempotencyKey, response);

      return jsonResponse(200, response);
    } catch (error) {
      await rollbackLedger(adminClient, requestId, 'GEMINI_IMAGE_ERROR');
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return jsonResponse(500, {
      error: 'AI_IMAGE_FAILED',
      message,
    });
  }
});
