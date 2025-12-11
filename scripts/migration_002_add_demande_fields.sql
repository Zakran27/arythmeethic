-- Migration: Add demande_type and niveau_eleve fields to clients table
-- Run this script in Supabase SQL Editor

-- Add niveau_eleve field for student level
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS niveau_eleve text;

-- Add demande_type field for request type (from contact form)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS demande_type text;

-- Add how_did_you_hear field (comment on entendu parler)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS how_did_you_hear text;

-- Add referrer_name field (if recommended by someone)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS referrer_name text;

-- Comments for documentation
COMMENT ON COLUMN public.clients.niveau_eleve IS 'Niveau de l''élève (CP, CE1, CE2, CM1, CM2, 6ème, etc.)';
COMMENT ON COLUMN public.clients.demande_type IS 'Type de demande (Bilan, Accompagnement, Atelier, etc.)';
COMMENT ON COLUMN public.clients.how_did_you_hear IS 'Comment avez-vous entendu parler de nous';
COMMENT ON COLUMN public.clients.referrer_name IS 'Nom de la personne qui a recommandé';
