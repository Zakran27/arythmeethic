-- Migration : messages temporaires du site (popup central + bandeau défilant)
-- Appliquée via le MCP Supabase (apply_migration: create_site_messages).
-- Conservée ici pour l'historique des changements de schéma.
--
-- Lecture publique (le site public lit les messages activés) ; écriture réservée
-- aux utilisateurs authentifiés (admin /admin/bandeaux).

CREATE TABLE IF NOT EXISTS site_messages (
  key text PRIMARY KEY,            -- 'popup' | 'banner'
  enabled boolean NOT NULL DEFAULT false,
  message text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_messages_public_read" ON site_messages;
CREATE POLICY "site_messages_public_read" ON site_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_messages_auth_write" ON site_messages;
CREATE POLICY "site_messages_auth_write" ON site_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO site_messages (key, enabled, message) VALUES
  ('popup', false, 'Pour les cours particuliers et l''accompagnement personnalisé, les inscriptions sont complètes jusqu''en janvier 2027. Vous pouvez toutefois nous envoyer une demande pour être inscrit(e) sur la liste d''attente.'),
  ('banner', false, 'Inscriptions complètes jusqu''en janvier 2027 — demande de liste d''attente possible.')
ON CONFLICT (key) DO NOTHING;
