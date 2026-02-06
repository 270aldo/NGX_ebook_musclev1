import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

export const buildRequestId = (endpoint: string, scopeKey: string, idempotencyKey: string): string => {
  const endpointPart = endpoint.slice(0, 32);
  const scopePart = scopeKey.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 120);
  const idemPart = idempotencyKey.replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 120);
  return `${endpointPart}:${scopePart}:${idemPart}`;
};

export const getIdempotentResponse = async (
  adminClient: SupabaseClient,
  endpoint: string,
  scopeKey: string,
  idempotencyKey: string,
): Promise<Record<string, unknown> | null> => {
  const { data, error } = await adminClient
    .from('idempotency_requests')
    .select('response')
    .eq('endpoint', endpoint)
    .eq('scope_key', scopeKey)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to query idempotency cache: ${error.message}`);
  }

  return (data?.response as Record<string, unknown>) ?? null;
};

export const saveIdempotentResponse = async (
  adminClient: SupabaseClient,
  endpoint: string,
  scopeKey: string,
  idempotencyKey: string,
  response: Record<string, unknown>,
): Promise<void> => {
  const { error } = await adminClient
    .from('idempotency_requests')
    .upsert(
      {
        endpoint,
        scope_key: scopeKey,
        idempotency_key: idempotencyKey,
        response,
      },
      { onConflict: 'endpoint,scope_key,idempotency_key' },
    );

  if (error) {
    throw new Error(`Failed to save idempotency cache: ${error.message}`);
  }
};
