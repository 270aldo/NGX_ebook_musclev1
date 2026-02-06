import { adminClient } from '../_shared/db.ts';
import { preflightResponse, jsonResponse } from '../_shared/cors.ts';
import { resolveIdentity } from '../_shared/identity.ts';
import { buildRequestId, getIdempotentResponse, saveIdempotentResponse } from '../_shared/idempotency.ts';
import {
  commitLedger,
  getDailyChatUsageForDemo,
  getDailyChatUsageForUser,
  getEffectivePriceCredits,
  getOrCreateDemoSession,
  getUsageLimits,
  getUserBudgetStatus,
  reserveDemoCredits,
  reserveUserCredits,
  rollbackLedger,
} from '../_shared/pricing.ts';
import { buildSystemInstruction } from '../_shared/systemPrompt.ts';
import { callGeminiText, estimateTextUsd, getTextModel } from '../_shared/gemini.ts';
import type { ChatHistoryItem, ChatMode, ModelTier } from '../_shared/types.ts';

const VALID_MODES: ChatMode[] = ['mentor', 'researcher', 'coach', 'visionary'];

interface ChatRequest {
  mode: ChatMode;
  message: string;
  conversationId?: string;
  isDemo?: boolean;
  idempotencyKey: string;
  history?: ChatHistoryItem[];
  deepDive?: boolean;
}

const isChatMode = (value: unknown): value is ChatMode => {
  return typeof value === 'string' && VALID_MODES.includes(value as ChatMode);
};

const normalizeHistory = (history: unknown): ChatHistoryItem[] => {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => {
      if (!item || typeof item !== 'object') {
        return false;
      }
      const role = (item as Record<string, unknown>).role;
      const content = (item as Record<string, unknown>).content;
      return (role === 'user' || role === 'assistant') && typeof content === 'string';
    })
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        role: row.role as 'user' | 'assistant',
        content: String(row.content),
      };
    })
    .slice(-8);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return preflightResponse();
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const body = (await req.json()) as Partial<ChatRequest>;

    if (!isChatMode(body.mode)) {
      return jsonResponse(400, { error: 'INVALID_MODE' });
    }

    const message = String(body.message ?? '').trim();
    if (!message) {
      return jsonResponse(400, { error: 'EMPTY_MESSAGE' });
    }

    const idempotencyKey = String(body.idempotencyKey ?? '').trim();
    if (!idempotencyKey) {
      return jsonResponse(400, { error: 'MISSING_IDEMPOTENCY_KEY' });
    }

    const identity = await resolveIdentity(req, adminClient);
    const endpoint = 'ai-chat';

    const cached = await getIdempotentResponse(adminClient, endpoint, identity.scopeKey, idempotencyKey);
    if (cached) {
      return jsonResponse(200, {
        ...cached,
        idempotentReplay: true,
      });
    }

    const usageLimits = await getUsageLimits(adminClient);

    let effectiveMode: ChatMode = body.mode;
    let modelTier: ModelTier = body.mode === 'researcher' && body.deepDive ? 'deep_dive' : 'stable';
    let downgradedBySoftCap = false;

    if (identity.userId) {
      const budget = await getUserBudgetStatus(adminClient, identity.userId);
      if (!budget.withinCap) {
        effectiveMode = 'mentor';
        modelTier = 'stable';
        downgradedBySoftCap = true;
      }

      const dailyMessages = await getDailyChatUsageForUser(adminClient, identity.userId);
      if (dailyMessages >= usageLimits.dailyMessages) {
        return jsonResponse(429, {
          error: 'DAILY_MESSAGE_LIMIT_REACHED',
          creditsRemaining: null,
        });
      }
    }

    const model = getTextModel(effectiveMode, modelTier);
    const creditsToCharge = await getEffectivePriceCredits(adminClient, 'chat', effectiveMode, modelTier);

    const requestId = buildRequestId(endpoint, identity.scopeKey, idempotencyKey);

    let reserveResult;
    let demoSessionId: string | null = null;

    if (identity.userId) {
      reserveResult = await reserveUserCredits(adminClient, {
        userId: identity.userId,
        requestId,
        operation: 'chat',
        mode: effectiveMode,
        model,
        modelTier,
        credits: creditsToCharge,
        metadata: {
          feature: 'bonus_ebook',
          conversationId: body.conversationId ?? null,
          originalMode: body.mode,
          effectiveMode,
          downgradedBySoftCap,
        },
      });
    } else {
      const demoSession = await getOrCreateDemoSession(adminClient, identity.deviceFingerprint);
      demoSessionId = demoSession.id;
      const dailyMessages = await getDailyChatUsageForDemo(adminClient, demoSession.id);
      if (dailyMessages >= usageLimits.dailyMessages) {
        return jsonResponse(429, {
          error: 'DAILY_MESSAGE_LIMIT_REACHED',
          creditsRemaining: demoSession.creditsRemaining,
          imageQuotaRemaining: demoSession.imagesRemaining,
          isDemo: true,
        });
      }

      reserveResult = await reserveDemoCredits(adminClient, {
        deviceFingerprint: identity.deviceFingerprint,
        requestId,
        operation: 'chat',
        mode: effectiveMode,
        model,
        modelTier,
        credits: creditsToCharge,
        isImage: false,
        metadata: {
          feature: 'bonus_ebook',
          conversationId: body.conversationId ?? null,
          originalMode: body.mode,
          effectiveMode,
          downgradedBySoftCap,
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

    const history = normalizeHistory(body.history);

    try {
      const textResult = await callGeminiText({
        model,
        mode: effectiveMode,
        message,
        history,
        systemInstruction: buildSystemInstruction(effectiveMode),
        useGoogleSearch: effectiveMode === 'researcher',
      });

      const usdEstimate = estimateTextUsd(
        model,
        textResult.usage.promptTokenCount,
        textResult.usage.candidatesTokenCount,
      );

      await commitLedger(adminClient, {
        requestId,
        tokensIn: textResult.usage.promptTokenCount,
        tokensOut: textResult.usage.candidatesTokenCount,
        groundedQueries: textResult.usage.groundedQueries,
        imageCount: 0,
        usdEstimate,
        metadata: {
          demoSessionId,
        },
      });

      const response: Record<string, unknown> = {
        assistantMessage: textResult.text || 'Disculpa, no pude generar una respuesta útil en este momento.',
        sources: textResult.sources,
        usage: {
          inputTokens: textResult.usage.promptTokenCount,
          outputTokens: textResult.usage.candidatesTokenCount,
          totalTokens: textResult.usage.totalTokenCount,
          groundedQueries: textResult.usage.groundedQueries,
        },
        creditsCharged: creditsToCharge,
        creditsRemaining: reserveResult.creditsRemaining,
        modelUsed: model,
        modeUsed: effectiveMode,
        downgradedBySoftCap,
        isDemo: identity.isDemo,
      };

      await saveIdempotentResponse(adminClient, endpoint, identity.scopeKey, idempotencyKey, response);

      return jsonResponse(200, response);
    } catch (error) {
      await rollbackLedger(adminClient, requestId, 'GEMINI_CHAT_ERROR');
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return jsonResponse(500, {
      error: 'AI_CHAT_FAILED',
      message,
    });
  }
});
