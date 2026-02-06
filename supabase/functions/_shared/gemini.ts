import {
  DEFAULT_TEXT_MODEL,
  GEMINI_API_KEY,
  IMAGE_HIGH_QUALITY_MODEL,
  IMAGE_MODEL_FLAT_USD,
  IMAGE_STANDARD_MODEL,
  RESEARCH_DEEP_DIVE_MODEL,
  TEXT_MODEL_PRICING_USD_PER_MILLION,
} from './config.ts';
import type { ChatHistoryItem, ChatMode, GroundingSource, ModelTier } from './types.ts';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const safeJson = async (response: Response): Promise<Record<string, unknown>> => {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const toContents = (history: ChatHistoryItem[], message: string): Array<Record<string, unknown>> => {
  const normalizedHistory = history
    .slice(-8)
    .filter((item) => typeof item.content === 'string' && item.content.trim().length > 0)
    .map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content.trim() }],
    }));

  normalizedHistory.push({
    role: 'user',
    parts: [{ text: message.trim() }],
  });

  return normalizedHistory;
};

export const getTextModel = (mode: ChatMode, modelTier: ModelTier): string => {
  if (mode === 'researcher' && modelTier === 'deep_dive') {
    return RESEARCH_DEEP_DIVE_MODEL;
  }
  return DEFAULT_TEXT_MODEL;
};

export const getImageModel = (modelTier: ModelTier): string => {
  return modelTier === 'high_quality' ? IMAGE_HIGH_QUALITY_MODEL : IMAGE_STANDARD_MODEL;
};

export const callGeminiText = async (args: {
  model: string;
  mode: ChatMode;
  message: string;
  history: ChatHistoryItem[];
  systemInstruction: string;
  useGoogleSearch: boolean;
}): Promise<{
  text: string;
  sources: GroundingSource[];
  usage: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    groundedQueries: number;
  };
}> => {
  const payload: Record<string, unknown> = {
    contents: toContents(args.history, args.message),
    systemInstruction: {
      parts: [{ text: args.systemInstruction }],
    },
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: 1100,
    },
  };

  if (args.useGoogleSearch) {
    payload.tools = [{ googleSearch: {} }];
  }

  const response = await fetch(`${GEMINI_BASE_URL}/models/${args.model}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await safeJson(response);
  if (!response.ok) {
    throw new Error(`Gemini text error (${response.status}): ${JSON.stringify(body)}`);
  }

  const candidates = (body.candidates as Array<Record<string, unknown>> | undefined) ?? [];
  const firstCandidate = candidates[0] ?? {};
  const content = (firstCandidate.content as Record<string, unknown> | undefined) ?? {};
  const parts = (content.parts as Array<Record<string, unknown>> | undefined) ?? [];

  const text = parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();

  const groundingMetadata = (firstCandidate.groundingMetadata as Record<string, unknown> | undefined) ?? {};
  const groundingChunks =
    (groundingMetadata.groundingChunks as Array<Record<string, unknown>> | undefined) ?? [];
  const webSearchQueries = (groundingMetadata.webSearchQueries as string[] | undefined) ?? [];

  const sources: GroundingSource[] = groundingChunks
    .map((chunk) => (chunk.web as Record<string, unknown> | undefined) ?? null)
    .filter((web): web is Record<string, unknown> => !!web)
    .map((web) => ({
      title: String(web.title ?? 'Fuente'),
      uri: String(web.uri ?? ''),
    }))
    .filter((source) => source.uri.length > 0);

  const usageMetadata = (body.usageMetadata as Record<string, unknown> | undefined) ?? {};
  const promptTokenCount = Number(usageMetadata.promptTokenCount ?? 0);
  const candidatesTokenCount = Number(usageMetadata.candidatesTokenCount ?? 0);
  const totalTokenCount = Number(usageMetadata.totalTokenCount ?? promptTokenCount + candidatesTokenCount);

  return {
    text,
    sources,
    usage: {
      promptTokenCount: Number.isFinite(promptTokenCount) ? promptTokenCount : 0,
      candidatesTokenCount: Number.isFinite(candidatesTokenCount) ? candidatesTokenCount : 0,
      totalTokenCount: Number.isFinite(totalTokenCount) ? totalTokenCount : 0,
      groundedQueries: webSearchQueries.length,
    },
  };
};

export const callGeminiImage = async (args: {
  model: string;
  prompt: string;
}): Promise<{
  imageDataUrl: string;
  usage: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}> => {
  const payload: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${args.prompt.trim()}. style: scientific illustration, cinematic lighting, neon medical style, high detail`,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  const response = await fetch(`${GEMINI_BASE_URL}/models/${args.model}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await safeJson(response);
  if (!response.ok) {
    throw new Error(`Gemini image error (${response.status}): ${JSON.stringify(body)}`);
  }

  const candidates = (body.candidates as Array<Record<string, unknown>> | undefined) ?? [];
  const firstCandidate = candidates[0] ?? {};
  const content = (firstCandidate.content as Record<string, unknown> | undefined) ?? {};
  const parts = (content.parts as Array<Record<string, unknown>> | undefined) ?? [];

  const inlinePart = parts.find((part) => {
    const inlineData = part.inlineData as Record<string, unknown> | undefined;
    return typeof inlineData?.data === 'string';
  });

  const inlineData = (inlinePart?.inlineData as Record<string, unknown> | undefined) ?? {};
  const mimeType = String(inlineData.mimeType ?? 'image/png');
  const base64 = String(inlineData.data ?? '');

  if (!base64) {
    throw new Error('Gemini image response did not contain binary image data');
  }

  const usageMetadata = (body.usageMetadata as Record<string, unknown> | undefined) ?? {};
  const promptTokenCount = Number(usageMetadata.promptTokenCount ?? 0);
  const candidatesTokenCount = Number(usageMetadata.candidatesTokenCount ?? 0);
  const totalTokenCount = Number(usageMetadata.totalTokenCount ?? promptTokenCount + candidatesTokenCount);

  return {
    imageDataUrl: `data:${mimeType};base64,${base64}`,
    usage: {
      promptTokenCount: Number.isFinite(promptTokenCount) ? promptTokenCount : 0,
      candidatesTokenCount: Number.isFinite(candidatesTokenCount) ? candidatesTokenCount : 0,
      totalTokenCount: Number.isFinite(totalTokenCount) ? totalTokenCount : 0,
    },
  };
};

export const callGeminiAudio = async (args: {
  model: string;
  text: string;
  voiceName?: string;
}): Promise<{
  audioBase64: string;
  mimeType: string;
  usage: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}> => {
  const payload: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [{ text: args.text.trim() }],
      },
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: args.voiceName ?? 'Kore',
          },
        },
      },
    },
  };

  const response = await fetch(`${GEMINI_BASE_URL}/models/${args.model}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await safeJson(response);
  if (!response.ok) {
    throw new Error(`Gemini audio error (${response.status}): ${JSON.stringify(body)}`);
  }

  const candidates = (body.candidates as Array<Record<string, unknown>> | undefined) ?? [];
  const firstCandidate = candidates[0] ?? {};
  const content = (firstCandidate.content as Record<string, unknown> | undefined) ?? {};
  const parts = (content.parts as Array<Record<string, unknown>> | undefined) ?? [];

  const inlinePart = parts.find((part) => {
    const inlineData = part.inlineData as Record<string, unknown> | undefined;
    return typeof inlineData?.data === 'string';
  });

  const inlineData = (inlinePart?.inlineData as Record<string, unknown> | undefined) ?? {};
  const mimeType = String(inlineData.mimeType ?? 'audio/pcm;rate=24000');
  const audioBase64 = String(inlineData.data ?? '');

  if (!audioBase64) {
    throw new Error('Gemini audio response did not contain binary audio data');
  }

  const usageMetadata = (body.usageMetadata as Record<string, unknown> | undefined) ?? {};
  const promptTokenCount = Number(usageMetadata.promptTokenCount ?? 0);
  const candidatesTokenCount = Number(usageMetadata.candidatesTokenCount ?? 0);
  const totalTokenCount = Number(usageMetadata.totalTokenCount ?? promptTokenCount + candidatesTokenCount);

  return {
    audioBase64,
    mimeType,
    usage: {
      promptTokenCount: Number.isFinite(promptTokenCount) ? promptTokenCount : 0,
      candidatesTokenCount: Number.isFinite(candidatesTokenCount) ? candidatesTokenCount : 0,
      totalTokenCount: Number.isFinite(totalTokenCount) ? totalTokenCount : 0,
    },
  };
};

export const estimateTextUsd = (model: string, tokensIn: number, tokensOut: number): number => {
  const price = TEXT_MODEL_PRICING_USD_PER_MILLION[model] ?? TEXT_MODEL_PRICING_USD_PER_MILLION.default;
  const inputCost = (Math.max(0, tokensIn) / 1_000_000) * price.input;
  const outputCost = (Math.max(0, tokensOut) / 1_000_000) * price.output;
  return Number((inputCost + outputCost).toFixed(6));
};

export const estimateImageUsd = (model: string, tier: 'standard' | 'high_quality'): number => {
  const byModel = IMAGE_MODEL_FLAT_USD[model] ?? IMAGE_MODEL_FLAT_USD.default;
  if (tier === 'high_quality') {
    return Number(Math.max(byModel, 0.08).toFixed(6));
  }
  return Number(byModel.toFixed(6));
};
