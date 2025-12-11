-- Migration: Add new contact fields for Particulier clients (Jeune/Parent)
-- Run this script in Supabase SQL Editor

-- Add client_status field to distinguish between Prospect and Client
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS client_status text CHECK (client_status IN ('Prospect', 'Client')) DEFAULT 'Prospect';

-- Add sub_type field to distinguish between Jeune and Parent for Particulier clients
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS sub_type text CHECK (sub_type IN ('Jeune', 'Parent'));

-- Add new contact fields for Jeune (nom, prénom, email, phone)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS first_name_jeune text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS last_name_jeune text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS email_jeune text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS phone_jeune text;

-- Add new contact fields for Parent 1 (nom, prénom, email, phone)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS first_name_parent1 text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS last_name_parent1 text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS email_parent1 text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS phone_parent1 text;

-- Add new contact fields for Parent 2 (nom, prénom, email, phone)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS first_name_parent2 text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS last_name_parent2 text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS email_parent2 text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS phone_parent2 text;

-- Add new procedure types for Etablissement
INSERT INTO public.procedure_types (code, label) VALUES
('QUALIFICATION', 'Qualification'),
('CONTRACTUALISATION', 'Contractualisation'),
('ENQUETE_SATISFACTION', 'Enquête de satisfaction')
ON CONFLICT (code) DO NOTHING;

-- Comments for documentation
COMMENT ON COLUMN public.clients.client_status IS 'Statut: Prospect ou Client';
COMMENT ON COLUMN public.clients.sub_type IS 'Sous-type pour les clients Particulier: Jeune ou Parent';
COMMENT ON COLUMN public.clients.first_name_jeune IS 'Prénom du jeune/élève';
COMMENT ON COLUMN public.clients.last_name_jeune IS 'Nom du jeune/élève';
COMMENT ON COLUMN public.clients.email_jeune IS 'Email du jeune/élève';
COMMENT ON COLUMN public.clients.phone_jeune IS 'Téléphone du jeune/élève';
COMMENT ON COLUMN public.clients.first_name_parent1 IS 'Prénom du Parent 1';
COMMENT ON COLUMN public.clients.last_name_parent1 IS 'Nom du Parent 1';
COMMENT ON COLUMN public.clients.email_parent1 IS 'Email du Parent 1';
COMMENT ON COLUMN public.clients.phone_parent1 IS 'Téléphone du Parent 1';
COMMENT ON COLUMN public.clients.first_name_parent2 IS 'Prénom du Parent 2';
COMMENT ON COLUMN public.clients.last_name_parent2 IS 'Nom du Parent 2';
COMMENT ON COLUMN public.clients.email_parent2 IS 'Email du Parent 2';
COMMENT ON COLUMN public.clients.phone_parent2 IS 'Téléphone du Parent 2';
