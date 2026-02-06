import { adminClient } from '../_shared/db.ts';
import { preflightResponse, jsonResponse } from '../_shared/cors.ts';
import { resolveIdentity } from '../_shared/identity.ts';
import {
  getOrCreateDemoSession,
  getUsageLimits,
  getUserBudgetStatus,
  getUserCreditsBalance,
  getWeeklyImageUsage,
} from '../_shared/pricing.ts';

const endOfWeekIso = (): string => {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const end = new Date(now);
  end.setUTCDate(now.getUTCDate() + daysUntilSunday);
  end.setUTCHours(23, 59, 59, 999);
  return end.toISOString();
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return preflightResponse();
  }

  if (req.method !== 'GET') {
    return jsonResponse(405, { error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const identity = await resolveIdentity(req, adminClient);

    if (identity.userId) {
      const [balance, usageLimits, budget, weeklyImageUsage] = await Promise.all([
        getUserCreditsBalance(adminClient, identity.userId),
        getUsageLimits(adminClient),
        getUserBudgetStatus(adminClient, identity.userId),
        getWeeklyImageUsage(adminClient, identity.userId),
      ]);

      return jsonResponse(200, {
        creditsRemaining: balance,
        periodEnd: endOfWeekIso(),
        imageQuotaRemaining: Math.max(0, usageLimits.weeklyImages - weeklyImageUsage),
        weeklyImageLimit: usageLimits.weeklyImages,
        dailyMessageLimit: usageLimits.dailyMessages,
        softUsdCap: usageLimits.softUsdCap,
        budgetConsumedUsd: budget.totalUsd,
        budgetPeriodDays: budget.periodDays,
        isDemo: false,
      });
    }

    const demo = await getOrCreateDemoSession(adminClient, identity.deviceFingerprint);

    return jsonResponse(200, {
      creditsRemaining: demo.creditsRemaining,
      periodEnd: demo.expiresAt,
      imageQuotaRemaining: demo.imagesRemaining,
      weeklyImageLimit: 1,
      dailyMessageLimit: 60,
      softUsdCap: null,
      budgetConsumedUsd: null,
      budgetPeriodDays: null,
      isDemo: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return jsonResponse(500, {
      error: 'BALANCE_FETCH_FAILED',
      message,
    });
  }
});
