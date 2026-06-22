-- Migration : éditeur de templates emails (item 12 retours Florence)
-- Appliquée via le MCP Supabase (apply_migration: create_email_templates).
-- Conservée ici pour l'historique des changements de schéma.
--
-- Une ligne par template personnalisé (clé = key du registre EMAIL_TEMPLATES
-- dans lib/email-templates.ts). Absence de ligne = la route garde son HTML par
-- défaut (zéro régression).

CREATE TABLE IF NOT EXISTS email_templates (
  key text PRIMARY KEY,
  subject text NOT NULL DEFAULT '',
  html text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_templates_authenticated_all" ON email_templates;
CREATE POLICY "email_templates_authenticated_all" ON email_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
