import { GroundingSource, IntelligenceMode } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const FUNCTIONS_BASE_URL = SUPABASE_URL
  ? `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1`
  : '/functions/v1';

const DEVICE_FINGERPRINT_KEY = 'bonus_device_fingerprint';
const AUTH_TOKEN_KEYS = ['bonus_access_token', 'sb-access-token', 'supabase.auth.token'];

const ensureDeviceFingerprint = (): string => {
  const existing = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
  if (existing) {
    return existing;
  }

  const generated = crypto.randomUUID();
  localStorage.setItem(DEVICE_FINGERPRINT_KEY, generated);
  return generated;
};

const getAuthToken = (): string | null => {
  for (const key of AUTH_TOKEN_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      continue;
    }

    if (!raw.trim().startsWith('{')) {
      return raw;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, any>;
      if (typeof parsed.access_token === 'string') {
        return parsed.access_token;
      }
      if (typeof parsed.currentSession?.access_token === 'string') {
        return parsed.currentSession.access_token;
      }
    } catch {
      // Ignore malformed tokens and continue.
    }
  }

  return null;
};

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const deviceFingerprint = ensureDeviceFingerprint();
  const authToken = getAuthToken();

  const headers = new Headers(init.headers ?? {});
  headers.set('x-device-fingerprint', deviceFingerprint);
  if (SUPABASE_ANON_KEY) {
    headers.set('apikey', SUPABASE_ANON_KEY);
  }
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(`${FUNCTIONS_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!response.ok) {
    const message = data?.message || data?.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
};

export interface ChatPayload {
  mode: IntelligenceMode;
  message: string;
  conversationId: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  deepDive?: boolean;
  idempotencyKey?: string;
}

export interface ChatResult {
  assistantMessage: string;
  sources?: GroundingSource[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    groundedQueries?: number;
  };
  creditsCharged: number;
  creditsRemaining: number;
  modelUsed: string;
  modeUsed: IntelligenceMode;
  downgradedBySoftCap?: boolean;
  isDemo: boolean;
}

export interface ImageResult {
  imageUrlOrBase64: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    imageCount?: number;
  };
  creditsCharged: number;
  creditsRemaining: number;
  imageQuotaRemaining?: number;
  modelUsed: string;
  modeUsed: IntelligenceMode;
  isDemo: boolean;
}

export interface AudioResult {
  audioBase64: string;
  mimeType: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  creditsCharged: number;
  creditsRemaining: number;
  modelUsed: string;
}

export interface CreditsBalanceResult {
  creditsRemaining: number;
  periodEnd: string;
  imageQuotaRemaining: number;
  weeklyImageLimit: number;
  dailyMessageLimit: number;
  softUsdCap: number | null;
  budgetConsumedUsd: number | null;
  budgetPeriodDays: number | null;
  isDemo: boolean;
}

export const sendChatMessage = async (payload: ChatPayload): Promise<ChatResult> => {
  return request<ChatResult>('/ai-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      idempotencyKey: payload.idempotencyKey ?? crypto.randomUUID(),
    }),
  });
};

export const generateImage = async (
  prompt: string,
  conversationId: string,
  idempotencyKey?: string,
): Promise<ImageResult> => {
  return request<ImageResult>('/ai-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      conversationId,
      idempotencyKey: idempotencyKey ?? crypto.randomUUID(),
      quality: 'standard',
    }),
  });
};

export const fetchCreditsBalance = async (): Promise<CreditsBalanceResult> => {
  return request<CreditsBalanceResult>('/credits-balance', {
    method: 'GET',
  });
};

export const generateNarrationAudio = async (
  text: string,
  conversationId: string,
  idempotencyKey?: string,
): Promise<AudioResult> => {
  return request<AudioResult>('/ai-audio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      conversationId,
      idempotencyKey: idempotencyKey ?? crypto.randomUUID(),
      voiceName: 'Kore',
    }),
  });
};
