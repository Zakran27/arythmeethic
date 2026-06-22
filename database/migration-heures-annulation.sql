-- Migration : heures facturées en cas d'annulation (item 8 retours Florence)
-- Appliquée via le MCP Supabase (apply_migration: add_heures_annulation).
-- Conservée ici pour l'historique des changements de schéma.

ALTER TABLE heures_realisees ADD COLUMN IF NOT EXISTS heures_annulation numeric DEFAULT 0;
