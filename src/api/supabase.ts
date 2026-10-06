import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { env } from '../lib/env';

/**
 * Supabase client typed with generated database schema.
 * Operates strictly with the signed-in admin's user session.
 * Never uses service_role key or any secret.
 */
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
