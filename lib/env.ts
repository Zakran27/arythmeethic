import { z } from 'zod';

// Client-side environment variables (NEXT_PUBLIC_* only)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// Server-side environment variables (includes all vars)
const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  N8N_BASE_URL: z.string().url(),
  N8N_WEBHOOK_CREATE_PROCEDURE: z.string().startsWith('/'),
  N8N_WEBHOOK_REQUEST_DOCS: z.string().startsWith('/'),
  N8N_WEBHOOK_UPLOAD: z.string().startsWith('/'),
  N8N_WEBHOOK_YOUSIGN: z.string().startsWith('/'),
  SMTP_FROM: z.string().optional(),
});

function getClientEnv() {
  const env = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
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
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    N8N_BASE_URL: process.env.N8N_BASE_URL,
    N8N_WEBHOOK_CREATE_PROCEDURE: process.env.N8N_WEBHOOK_CREATE_PROCEDURE,
    N8N_WEBHOOK_REQUEST_DOCS: process.env.N8N_WEBHOOK_REQUEST_DOCS,
    N8N_WEBHOOK_UPLOAD: process.env.N8N_WEBHOOK_UPLOAD,
    N8N_WEBHOOK_YOUSIGN: process.env.N8N_WEBHOOK_YOUSIGN,
    SMTP_FROM: process.env.SMTP_FROM,
  };

  const parsed = serverEnvSchema.safeParse(env);

  if (!parsed.success) {
    console.error('❌ Invalid server environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

// Export appropriate env based on runtime
export const env = typeof window === 'undefined' ? getServerEnv() : getClientEnv();
