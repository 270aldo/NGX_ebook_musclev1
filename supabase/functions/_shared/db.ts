import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from './config.ts';

export const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
