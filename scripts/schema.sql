-- Enums
create type proc_status as enum (
  'DRAFT','PDF_GENERATED','SIGN_REQUESTED','SIGNED','REFUSED','EXPIRED','CLOSED'
);

-- Profiles (links to auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone1 text,
  phone2 text,
  phone3 text,
  type_client text check (type_client in ('Particulier','École')) default 'Particulier',
  organisation text,
  address_line1 text,
  postal_code text,
  city text,
  country text,
  notes text,
  created_at timestamptz not null default now()
);

-- Procedure types
create table public.procedure_types (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text not null,
  is_active boolean not null default true
);

-- Procedures
create table public.procedures (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  procedure_type_id uuid not null references public.procedure_types(id),
  status proc_status not null default 'DRAFT',
  yousign_procedure_id text,
  yousign_file_id text,
  deadline_at date,
  signed_at timestamptz,
  owner text,
  upload_token text,
  upload_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid references public.procedures(id) on delete set null,
  kind text check (kind in ('CONTRACT','CONTRACT_SIGNED','ANNEX','SUPPORTING_DOC')) not null,
  title text not null,
  storage_path text,
  uploaded_by text check (uploaded_by in ('ADMIN','CLIENT','EMAIL')) default 'ADMIN',
  hash_sha256 text,
  created_at timestamptz not null default now()
);

-- Audit log
create table public.audit_log (
  id bigserial primary key,
  source text not null,
  event text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index on public.procedures (client_id);
create index on public.documents (procedure_id);
create index on public.audit_log (created_at);

-- Seed procedure types
insert into public.procedure_types (code, label) values
('NEW_CLIENT','Nouveau client'),
('RENEWAL','Renouvellement')
on conflict (code) do nothing;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.procedure_types enable row level security;
alter table public.procedures enable row level security;
alter table public.documents enable row level security;
alter table public.audit_log enable row level security;

-- RLS Policies (admin full access)
-- Profiles: users can read their own, admins can read all
create policy "users_read_own_profile" on public.profiles
  for select using (auth.uid() = id);

create policy "admins_read_all_profiles" on public.profiles
  for select using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- All other tables: admin-only access
create policy "admin_clients_all" on public.clients
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admin_procedure_types_all" on public.procedure_types
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admin_procedures_all" on public.procedures
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admin_documents_all" on public.documents
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admin_audit_log_read" on public.audit_log
  for select using ((select role from public.profiles where id = auth.uid()) = 'admin');
