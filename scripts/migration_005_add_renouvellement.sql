-- Migration: Add fields and procedure type for "Souhait de renouvellement"
-- Run this script in Supabase SQL Editor

-- Add fields for renewal response
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS renouvellement_souhaite boolean;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS renouvellement_commentaire text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS renouvellement_date_reponse timestamptz;

-- Add token for renewal form access
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS renouvellement_token text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS renouvellement_token_expires_at timestamptz;

-- Add field to track last renewal email sent (for relance logic)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS renouvellement_dernier_email_at timestamptz;

-- Add procedure type for "Souhait de renouvellement"
INSERT INTO public.procedure_types (code, label) VALUES
('SOUHAIT_RENOUVELLEMENT', 'Souhait de renouvellement')
ON CONFLICT (code) DO NOTHING;

-- Comments for documentation
COMMENT ON COLUMN public.clients.renouvellement_souhaite IS 'Réponse du client: souhaite-t-il renouveler l''accompagnement?';
COMMENT ON COLUMN public.clients.renouvellement_commentaire IS 'Commentaire libre du client sur le renouvellement';
COMMENT ON COLUMN public.clients.renouvellement_date_reponse IS 'Date à laquelle le client a répondu au formulaire de renouvellement';
COMMENT ON COLUMN public.clients.renouvellement_token IS 'Token sécurisé pour accéder au formulaire de renouvellement';
COMMENT ON COLUMN public.clients.renouvellement_token_expires_at IS 'Date d''expiration du token de renouvellement';
COMMENT ON COLUMN public.clients.renouvellement_dernier_email_at IS 'Date du dernier email de renouvellement envoyé (pour éviter les doublons)';
