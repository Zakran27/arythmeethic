-- Migration: Add fields for "Recueil des informations" procedure
-- Run this script in Supabase SQL Editor

-- Add CESU number (optional)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS numero_cesu text;

-- Add address for tutoring sessions
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS adresse_cours text;

-- Add school establishment name
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS etablissement_scolaire text;

-- Add math average
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS moyenne_maths text;

-- Add general average
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS moyenne_generale text;

-- Add available days for tutoring (stored as JSON array)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS jours_disponibles text[];

-- Add token for form access (secure link)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS form_token text;

-- Add token expiration
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS form_token_expires_at timestamptz;

-- Add procedure type for "Recueil des informations"
INSERT INTO public.procedure_types (code, label) VALUES
('RECUEIL_INFORMATIONS', 'Recueil des informations')
ON CONFLICT (code) DO NOTHING;

-- Comments for documentation
COMMENT ON COLUMN public.clients.numero_cesu IS 'Numéro CESU du client (facultatif)';
COMMENT ON COLUMN public.clients.adresse_cours IS 'Adresse où se déroulent les cours particuliers';
COMMENT ON COLUMN public.clients.etablissement_scolaire IS 'Nom de l''établissement scolaire de l''élève';
COMMENT ON COLUMN public.clients.moyenne_maths IS 'Moyenne en mathématiques de l''élève';
COMMENT ON COLUMN public.clients.moyenne_generale IS 'Moyenne générale de l''élève';
COMMENT ON COLUMN public.clients.jours_disponibles IS 'Jours possibles pour les cours (tableau)';
COMMENT ON COLUMN public.clients.form_token IS 'Token sécurisé pour accéder au formulaire de recueil';
COMMENT ON COLUMN public.clients.form_token_expires_at IS 'Date d''expiration du token de formulaire';
