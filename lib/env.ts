import { z } from 'zod';

// Client-side environment variables (NEXT_PUBLIC_* only)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().min(1).default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// Server-side environment variables (includes all vars)
const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

function getClientEnv() {
  const env = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  const parsed = clientEnvSchema.safeParse(env);

  if (!parsed.success) {
    console.error('❌ Invalid client environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

function getServerEnv() {
  const env = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const parsed = serverEnvSchema.safeParse(env);

  if (!parsed.success) {
    console.error('❌ Invalid server environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

// Cache the env to avoid re-validation
let _clientEnv: z.infer<typeof clientEnvSchema> | null = null;
let _serverEnv: z.infer<typeof serverEnvSchema> | null = null;

// Export appropriate env based on runtime
export const env =
  typeof window === 'undefined' ? (_serverEnv ??= getServerEnv()) : (_clientEnv ??= getClientEnv());

// Explicitly export server env for API routes (with lazy evaluation)
export const serverEnv = new Proxy({} as z.infer<typeof serverEnvSchema>, {
  get(_, prop) {
    if (!_serverEnv) {
      _serverEnv = getServerEnv();
    }
    return _serverEnv[prop as keyof typeof _serverEnv];
  },
});
