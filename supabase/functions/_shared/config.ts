const requireEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const SUPABASE_URL = requireEnv('SUPABASE_URL');
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
export const GEMINI_API_KEY = requireEnv('GEMINI_API_KEY');

export const CORS_ALLOW_ORIGIN = Deno.env.get('CORS_ALLOW_ORIGIN') ?? '*';

export const DEFAULT_TEXT_MODEL = Deno.env.get('GEMINI_TEXT_MODEL_DEFAULT') ?? 'gemini-2.5-flash';
export const RESEARCH_DEEP_DIVE_MODEL = Deno.env.get('GEMINI_TEXT_MODEL_DEEP_DIVE') ?? 'gemini-2.5-pro';
export const IMAGE_STANDARD_MODEL = Deno.env.get('GEMINI_IMAGE_MODEL_STANDARD') ?? 'gemini-2.0-flash-preview-image-generation';
export const IMAGE_HIGH_QUALITY_MODEL = Deno.env.get('GEMINI_IMAGE_MODEL_HIGH_QUALITY') ?? IMAGE_STANDARD_MODEL;
export const TTS_MODEL = Deno.env.get('GEMINI_TTS_MODEL') ?? 'gemini-2.5-flash-preview-tts';

export const BONUS_FEATURE = 'bonus_ebook';
export const DEFAULT_PLAN_ID = 'default';

export const TEXT_MODEL_PRICING_USD_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'gemini-2.5-pro': { input: 3.5, output: 10 },
  default: { input: 0.5, output: 2.5 },
};

export const IMAGE_MODEL_FLAT_USD: Record<string, number> = {
  [IMAGE_STANDARD_MODEL]: 0.04,
  [IMAGE_HIGH_QUALITY_MODEL]: 0.08,
  default: 0.05,
};
