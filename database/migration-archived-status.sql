-- Migration : ajout du statut "Archivé" pour les clients (item 2 retours Florence)
-- Appliquée via le MCP Supabase (apply_migration: add_archived_status).
-- Conservée ici pour l'historique des changements de schéma.

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_status_check;

ALTER TABLE clients ADD CONSTRAINT clients_client_status_check
  CHECK (client_status = ANY (ARRAY['Prospect'::text, 'Client'::text, 'Archivé'::text]));

ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_at timestamptz;
