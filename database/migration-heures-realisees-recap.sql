-- Migration: tracking de l'envoi du récap mensuel + report cumulé des heures
-- À exécuter dans Supabase (SQL editor)

ALTER TABLE heures_realisees
  ADD COLUMN IF NOT EXISTS recap_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recap_email_to TEXT,
  ADD COLUMN IF NOT EXISTS report_in NUMERIC(6,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN heures_realisees.recap_email_sent_at IS 'Date d''envoi du récap mensuel pour ce mois (null si jamais envoyé)';
COMMENT ON COLUMN heures_realisees.recap_email_to IS 'Adresse email du destinataire du récap pour ce mois';
COMMENT ON COLUMN heures_realisees.report_in IS 'Heures de report (issues de temps_a_reporter cumulé) ajoutées à la facturation de ce mois lors de l''envoi du récap';
