import { CORS_ALLOW_ORIGIN } from './config.ts';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': CORS_ALLOW_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-fingerprint',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const jsonResponse = (status: number, payload: unknown): Response => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
};

export const preflightResponse = (): Response => {
  return new Response('ok', {
    status: 200,
    headers: corsHeaders,
  });
};
