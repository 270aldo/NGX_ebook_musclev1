import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

export interface RequestIdentity {
  userId: string | null;
  isDemo: boolean;
  scopeKey: string;
  deviceFingerprint: string;
}

const sanitizeFingerprint = (input: string): string => {
  return input.replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 120);
};

const fallbackFingerprint = (req: Request): string => {
  const forwarded = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? '';
  const ip = forwarded.split(',')[0]?.trim();
  if (ip) {
    return sanitizeFingerprint(`ip_${ip}`);
  }
  return sanitizeFingerprint(`anon_${crypto.randomUUID()}`);
};

export const resolveIdentity = async (
  req: Request,
  adminClient: SupabaseClient,
): Promise<RequestIdentity> => {
  const headerFingerprint = req.headers.get('x-device-fingerprint');
  const deviceFingerprint = sanitizeFingerprint(headerFingerprint ?? fallbackFingerprint(req));

  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      userId: null,
      isDemo: true,
      scopeKey: `demo:${deviceFingerprint}`,
      deviceFingerprint,
    };
  }

  const jwt = authHeader.slice('Bearer '.length).trim();
  if (!jwt) {
    return {
      userId: null,
      isDemo: true,
      scopeKey: `demo:${deviceFingerprint}`,
      deviceFingerprint,
    };
  }

  const { data, error } = await adminClient.auth.getUser(jwt);
  if (error || !data?.user?.id) {
    return {
      userId: null,
      isDemo: true,
      scopeKey: `demo:${deviceFingerprint}`,
      deviceFingerprint,
    };
  }

  return {
    userId: data.user.id,
    isDemo: false,
    scopeKey: `user:${data.user.id}`,
    deviceFingerprint,
  };
};
