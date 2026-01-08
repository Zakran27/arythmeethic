-- Migration: Add procedure type for "Préparation RDV 1"
-- Run this script in Supabase SQL Editor

-- Add procedure type for "Préparation RDV 1"
INSERT INTO public.procedure_types (code, label) VALUES
('PREPARATION_RDV1', 'Préparation RDV 1')
ON CONFLICT (code) DO NOTHING;
