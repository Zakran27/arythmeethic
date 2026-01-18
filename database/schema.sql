-- ============================================
-- A Rythme Ethic - Database Schema
-- Complete schema for Supabase PostgreSQL
-- Last updated: January 2026
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- Procedure status (for legacy tracking)
CREATE TYPE proc_status AS ENUM (
  'DRAFT',
  'PDF_GENERATED',
  'SIGN_REQUESTED',
  'SIGNED',
  'REFUSED',
  'EXPIRED',
  'CLOSED'
);

-- Procedure status labels (human-readable history)
CREATE TYPE procedure_status_label AS ENUM (
  'MAIL_ENVOYE',
  'FORMULAIRE_REMPLI',
  'RELANCE_ENVOYEE',
  'MAIL_AVIS_GOOGLE_ENVOYE'
);

-- ============================================
-- TABLES
-- ============================================

-- Profiles (links to auth.users for admin access)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Basic info
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone1 text,
  phone2 text,
  phone3 text,
  -- Client type
  type_client text CHECK (type_client IN ('Particulier', 'École')) DEFAULT 'Particulier',
  sub_type text CHECK (sub_type IN ('Jeune', 'Parent') OR sub_type IS NULL),
  client_status text CHECK (client_status IN ('Prospect', 'Client')) DEFAULT 'Prospect',
  organisation text,
  -- Address
  address_line1 text,
  postal_code text,
  city text,
  country text,
  -- Notes
  notes text,
  -- Jeune (young person) info
  first_name_jeune text,
  last_name_jeune text,
  email_jeune text,
  phone_jeune text,
  -- Parent 1 info
  first_name_parent1 text,
  last_name_parent1 text,
  email_parent1 text,
  phone_parent1 text,
  -- Parent 2 info
  first_name_parent2 text,
  last_name_parent2 text,
  email_parent2 text,
  phone_parent2 text,
  -- Contact form info
  niveau_eleve text,
  demande_type text,
  how_did_you_hear text,
  referrer_name text,
  -- Recueil des informations fields
  numero_cesu text,
  adresse_cours text,
  etablissement_scolaire text,
  moyenne_maths text,
  moyenne_generale text,
  jours_disponibles text[],
  form_token text,
  form_token_expires_at timestamptz,
  -- Renouvellement fields
  renouvellement_souhaite boolean,
  renouvellement_commentaire text,
  renouvellement_date_reponse timestamptz,
  renouvellement_token text,
  renouvellement_token_expires_at timestamptz,
  renouvellement_dernier_email_at timestamptz,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Procedure types
CREATE TABLE public.procedure_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

-- Procedures
CREATE TABLE public.procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  procedure_type_id uuid NOT NULL REFERENCES public.procedure_types(id),
  status proc_status NOT NULL DEFAULT 'DRAFT',
  -- YouSign integration (future)
  yousign_procedure_id text,
  yousign_file_id text,
  deadline_at date,
  signed_at timestamptz,
  owner text,
  -- Upload token
  upload_token text,
  upload_token_expires_at timestamptz,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Procedure status history (human-readable tracking)
CREATE TABLE public.procedure_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  status procedure_status_label NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id uuid REFERENCES public.procedures(id) ON DELETE SET NULL,
  kind text CHECK (kind IN ('CONTRACT', 'CONTRACT_SIGNED', 'ANNEX', 'SUPPORTING_DOC')) NOT NULL,
  title text NOT NULL,
  storage_path text,
  uploaded_by text CHECK (uploaded_by IN ('ADMIN', 'CLIENT', 'EMAIL')) DEFAULT 'ADMIN',
  original_filename text,
  hash_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE public.audit_log (
  id bigserial PRIMARY KEY,
  source text NOT NULL,
  event text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_procedures_client_id ON public.procedures(client_id);
CREATE INDEX idx_documents_procedure_id ON public.documents(procedure_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);
CREATE INDEX idx_procedure_status_history_procedure_id ON public.procedure_status_history(procedure_id);
CREATE INDEX idx_procedure_status_history_created_at ON public.procedure_status_history(created_at);

-- ============================================
-- SEED DATA
-- ============================================

-- Procedure types
INSERT INTO public.procedure_types (code, label) VALUES
  ('RECUEIL_INFORMATIONS', 'Recueil des informations'),
  ('PREPARATION_RDV1', 'Préparation RDV 1'),
  ('CONTRACTUALISATION', 'Contractualisation'),
  ('DECLARATION_HEURES', 'Déclaration des heures'),
  ('SOUHAIT_RENOUVELLEMENT', 'Souhait de renouvellement'),
  ('FIN_CONTRAT', 'Fin de contrat')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "users_read_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "admins_read_all_profiles" ON public.profiles
  FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Admin-only access for all other tables
CREATE POLICY "admin_clients_all" ON public.clients
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_procedure_types_all" ON public.procedure_types
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_procedures_all" ON public.procedures
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_procedure_status_history_all" ON public.procedure_status_history
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_documents_all" ON public.documents
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_audit_log_read" ON public.audit_log
  FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'admin')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STORAGE
-- ============================================

-- Note: Run this in Supabase Dashboard > Storage
-- Create bucket: client-files (private)
--
-- Storage policies:
-- INSERT: authenticated users
-- SELECT: authenticated users
-- UPDATE: authenticated users
-- DELETE: authenticated users
