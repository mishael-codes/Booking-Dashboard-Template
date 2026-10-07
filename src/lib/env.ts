import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url({ message: 'VITE_SUPABASE_URL must be a valid URL' }),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, { message: 'VITE_SUPABASE_ANON_KEY is required' }),
});

const parsedEnv = envSchema.safeParse(import.meta.env);

export const env = {
  VITE_SUPABASE_URL: parsedEnv.success
    ? parsedEnv.data.VITE_SUPABASE_URL
    : 'https://placeholder.supabase.co',
  VITE_SUPABASE_ANON_KEY: parsedEnv.success
    ? parsedEnv.data.VITE_SUPABASE_ANON_KEY
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_preview',
  isConfigured: parsedEnv.success,
};

if (!parsedEnv.success) {
  console.warn(
    '[CONFIG WARNING] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not detected in environment. Running in preview mode with placeholder endpoints.'
  );
}
