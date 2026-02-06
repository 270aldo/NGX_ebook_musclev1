import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { DEFAULT_PLAN_ID } from './config.ts';

interface ReserveUserCreditsResult {
  success: boolean;
  error_code: string | null;
  balance: number;
  ledger_id: string | null;
}

interface ReserveDemoCreditsResult {
  success: boolean;
  error_code: string | null;
  credits_remaining: number;
  images_remaining: number;
  demo_session_id: string | null;
  ledger_id: string | null;
}

export interface ReserveResult {
  success: boolean;
  errorCode: string | null;
  creditsRemaining: number;
  imagesRemaining?: number;
  demoSessionId?: string | null;
}

export interface UsageLimits {
  weeklyImages: number;
  dailyMessages: number;
  softUsdCap: number;
  periodDays: number;
}

export interface BudgetStatus {
  totalUsd: number;
  softUsdCap: number;
  periodDays: number;
  withinCap: boolean;
}

const firstRow = <T>(value: T[] | T | null): T | null => {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
};

export const getEffectivePriceCredits = async (
  adminClient: SupabaseClient,
  operation: 'chat' | 'image',
  mode: 'mentor' | 'researcher' | 'coach' | 'visionary',
  modelTier: string,
  planId = DEFAULT_PLAN_ID,
): Promise<number> => {
  const { data, error } = await adminClient.rpc('get_effective_price_credits', {
    p_operation: operation,
    p_mode: mode,
    p_model_tier: modelTier,
    p_plan_id: planId,
  });

  if (error) {
    throw new Error(`Unable to calculate price credits: ${error.message}`);
  }

  const numericValue = Number(data ?? 0);
  if (!Number.isFinite(numericValue)) {
    throw new Error('Invalid price credits value');
  }

  return Math.max(0, Math.round(numericValue));
};

export const reserveUserCredits = async (
  adminClient: SupabaseClient,
  args: {
    userId: string;
    requestId: string;
    operation: 'chat' | 'image';
    mode: 'mentor' | 'researcher' | 'coach' | 'visionary';
    model: string;
    modelTier: string;
    credits: number;
    metadata?: Record<string, unknown>;
  },
): Promise<ReserveResult> => {
  const { data, error } = await adminClient.rpc('reserve_user_credits', {
    p_user_id: args.userId,
    p_request_id: args.requestId,
    p_operation: args.operation,
    p_mode: args.mode,
    p_model: args.model,
    p_model_tier: args.modelTier,
    p_credits: args.credits,
    p_metadata: args.metadata ?? {},
  });

  if (error) {
    throw new Error(`Unable to reserve user credits: ${error.message}`);
  }

  const row = firstRow(data as ReserveUserCreditsResult[] | ReserveUserCreditsResult | null);
  if (!row) {
    throw new Error('Empty reserve_user_credits result');
  }

  return {
    success: row.success,
    errorCode: row.error_code,
    creditsRemaining: row.balance,
  };
};

export const reserveDemoCredits = async (
  adminClient: SupabaseClient,
  args: {
    deviceFingerprint: string;
    requestId: string;
    operation: 'chat' | 'image';
    mode: 'mentor' | 'researcher' | 'coach' | 'visionary';
    model: string;
    modelTier: string;
    credits: number;
    isImage: boolean;
    metadata?: Record<string, unknown>;
  },
): Promise<ReserveResult> => {
  const { data, error } = await adminClient.rpc('reserve_demo_credits', {
    p_device_fingerprint: args.deviceFingerprint,
    p_request_id: args.requestId,
    p_operation: args.operation,
    p_mode: args.mode,
    p_model: args.model,
    p_model_tier: args.modelTier,
    p_credits: args.credits,
    p_is_image: args.isImage,
    p_metadata: args.metadata ?? {},
  });

  if (error) {
    throw new Error(`Unable to reserve demo credits: ${error.message}`);
  }

  const row = firstRow(data as ReserveDemoCreditsResult[] | ReserveDemoCreditsResult | null);
  if (!row) {
    throw new Error('Empty reserve_demo_credits result');
  }

  return {
    success: row.success,
    errorCode: row.error_code,
    creditsRemaining: row.credits_remaining,
    imagesRemaining: row.images_remaining,
    demoSessionId: row.demo_session_id,
  };
};

export const commitLedger = async (
  adminClient: SupabaseClient,
  args: {
    requestId: string;
    tokensIn: number;
    tokensOut: number;
    groundedQueries: number;
    imageCount: number;
    usdEstimate: number;
    metadata?: Record<string, unknown>;
  },
): Promise<void> => {
  const { data, error } = await adminClient.rpc('commit_ledger_request', {
    p_request_id: args.requestId,
    p_tokens_in: args.tokensIn,
    p_tokens_out: args.tokensOut,
    p_grounded_queries: args.groundedQueries,
    p_image_count: args.imageCount,
    p_usd_estimate: args.usdEstimate,
    p_metadata: args.metadata ?? {},
  });

  if (error || data !== true) {
    throw new Error(`Unable to commit ledger request: ${error?.message ?? 'unknown error'}`);
  }
};

export const rollbackLedger = async (
  adminClient: SupabaseClient,
  requestId: string,
  reason: string,
): Promise<void> => {
  await adminClient.rpc('rollback_ledger_request', {
    p_request_id: requestId,
    p_reason: reason,
  });
};

export const getUsageLimits = async (adminClient: SupabaseClient, planId = DEFAULT_PLAN_ID): Promise<UsageLimits> => {
  const { data, error } = await adminClient
    .from('usage_limits')
    .select('weekly_images, daily_messages, soft_usd_cap, period_days')
    .eq('plan_id', planId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to read usage limits: ${error.message}`);
  }

  return {
    weeklyImages: Number(data?.weekly_images ?? 2),
    dailyMessages: Number(data?.daily_messages ?? 60),
    softUsdCap: Number(data?.soft_usd_cap ?? 2.5),
    periodDays: Number(data?.period_days ?? 84),
  };
};

export const getUserBudgetStatus = async (
  adminClient: SupabaseClient,
  userId: string,
  planId = DEFAULT_PLAN_ID,
): Promise<BudgetStatus> => {
  const { data, error } = await adminClient.rpc('get_user_budget_status', {
    p_user_id: userId,
    p_plan_id: planId,
  });

  if (error) {
    throw new Error(`Unable to read budget status: ${error.message}`);
  }

  const row = firstRow(
    data as
      | {
          total_usd: number;
          soft_usd_cap: number;
          period_days: number;
          within_cap: boolean;
        }[]
      | {
          total_usd: number;
          soft_usd_cap: number;
          period_days: number;
          within_cap: boolean;
        }
      | null,
  );

  return {
    totalUsd: Number(row?.total_usd ?? 0),
    softUsdCap: Number(row?.soft_usd_cap ?? 2.5),
    periodDays: Number(row?.period_days ?? 84),
    withinCap: Boolean(row?.within_cap ?? true),
  };
};

export const getWeeklyImageUsage = async (adminClient: SupabaseClient, userId: string): Promise<number> => {
  const weekStart = new Date();
  const day = weekStart.getUTCDay();
  const distanceToMonday = day === 0 ? 6 : day - 1;
  weekStart.setUTCDate(weekStart.getUTCDate() - distanceToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await adminClient
    .from('credit_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('operation', 'image')
    .eq('status', 'committed')
    .gte('created_at', weekStart.toISOString());

  if (error) {
    throw new Error(`Unable to compute weekly image usage: ${error.message}`);
  }

  return count ?? 0;
};

export const getDailyChatUsageForUser = async (adminClient: SupabaseClient, userId: string): Promise<number> => {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await adminClient
    .from('credit_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('operation', 'chat')
    .eq('status', 'committed')
    .gte('created_at', dayStart.toISOString());

  if (error) {
    throw new Error(`Unable to compute daily chat usage: ${error.message}`);
  }

  return count ?? 0;
};

export const getDailyChatUsageForDemo = async (
  adminClient: SupabaseClient,
  demoSessionId: string,
): Promise<number> => {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await adminClient
    .from('credit_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('demo_session_id', demoSessionId)
    .eq('operation', 'chat')
    .eq('status', 'committed')
    .gte('created_at', dayStart.toISOString());

  if (error) {
    throw new Error(`Unable to compute daily demo chat usage: ${error.message}`);
  }

  return count ?? 0;
};

export const getUserCreditsBalance = async (adminClient: SupabaseClient, userId: string): Promise<number> => {
  const { data, error } = await adminClient
    .from('credit_wallets')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to read wallet balance: ${error.message}`);
  }

  return Number(data?.balance ?? 0);
};

export const getOrCreateDemoSession = async (
  adminClient: SupabaseClient,
  deviceFingerprint: string,
): Promise<{ id: string; creditsRemaining: number; imagesRemaining: number; expiresAt: string }> => {
  const { data: existing, error: existingError } = await adminClient
    .from('demo_sessions')
    .select('id, credits_remaining, images_remaining, expires_at')
    .eq('device_fingerprint', deviceFingerprint)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to read demo session: ${existingError.message}`);
  }

  const nowIso = new Date().toISOString();

  if (!existing) {
    const { data: created, error: createError } = await adminClient
      .from('demo_sessions')
      .insert({ device_fingerprint: deviceFingerprint })
      .select('id, credits_remaining, images_remaining, expires_at')
      .single();

    if (createError || !created) {
      throw new Error(`Unable to create demo session: ${createError?.message ?? 'unknown error'}`);
    }

    return {
      id: created.id,
      creditsRemaining: Number(created.credits_remaining),
      imagesRemaining: Number(created.images_remaining),
      expiresAt: created.expires_at,
    };
  }

  if (existing.expires_at <= nowIso) {
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: reset, error: resetError } = await adminClient
      .from('demo_sessions')
      .update({
        credits_remaining: 15,
        images_remaining: 1,
        expires_at: expiresAt,
      })
      .eq('id', existing.id)
      .select('id, credits_remaining, images_remaining, expires_at')
      .single();

    if (resetError || !reset) {
      throw new Error(`Unable to reset demo session: ${resetError?.message ?? 'unknown error'}`);
    }

    return {
      id: reset.id,
      creditsRemaining: Number(reset.credits_remaining),
      imagesRemaining: Number(reset.images_remaining),
      expiresAt: reset.expires_at,
    };
  }

  return {
    id: existing.id,
    creditsRemaining: Number(existing.credits_remaining),
    imagesRemaining: Number(existing.images_remaining),
    expiresAt: existing.expires_at,
  };
};
