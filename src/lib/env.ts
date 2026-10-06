import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url({ message: 'VITE_SUPABASE_URL must be a valid URL' }),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, { message: 'VITE_SUPABASE_ANON_KEY is required' }),
});

const parsedEnv = envSchema.safeParse(import.meta.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error(
    `[FATAL] Environment validation failed. Required variables missing or malformed:\n${issues}`
  );
  // Throw at startup so misconfigured deployments fail immediately and safely
  throw new Error(`Environment validation failed:\n${issues}`);
}

export const env = parsedEnv.data;
