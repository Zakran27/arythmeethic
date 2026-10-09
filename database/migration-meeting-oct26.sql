-- Retours Florence (meeting 6 oct. 2026) — schéma pour les lots 2 à 9, en une seule fois.
-- Tout est additif / nullable : sans effet sur le code déjà en production.

-- ===== Lot 2 : CESU / Ponctuel + documents ajoutés par l'admin =====
alter table public.clients
  add column if not exists mode_facturation text check (mode_facturation in ('CESU', 'Ponctuel'));
update public.clients set mode_facturation = 'CESU'
  where type_client = 'Particulier' and numero_cesu is not null and numero_cesu <> '' and mode_facturation is null;

alter table public.documents
  add column if not exists client_id uuid references public.clients(id) on delete cascade;
create index if not exists documents_client_id_idx on public.documents(client_id);
update public.documents d set client_id = p.client_id
  from public.procedures p where d.procedure_id = p.id and d.client_id is null;

-- ===== Lot 3 : heures / déclaration mensuelle =====
-- report_in : NULL = prévisionnel (calculé), nombre = figé (envoi, « Mettre à jour le compteur » ou saisie manuelle)
alter table public.heures_realisees alter column report_in drop not null, alter column report_in drop default;
update public.heures_realisees set report_in = null where recap_email_sent_at is null;
comment on column public.heures_realisees.report_in is
  'Heures de report facturées ce mois. NULL = prévisionnel (calcul auto) ; un nombre = valeur figée (envoi du récap, mise à jour manuelle).';
alter table public.heures_realisees
  add column if not exists premier_rdv_heures numeric not null default 0 check (premier_rdv_heures >= 0),
  add column if not exists premier_rdv_date date,
  add column if not exists sans_declaration boolean not null default false,
  add column if not exists salaire_recu_le date;

-- ===== Lot 4 : suivi des prises de contact + liste d'attente =====
create table if not exists public.contact_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  canal text not null check (canal in ('Appel', 'SMS', 'Message vocal', 'Email', 'Rendez-vous', 'Autre')),
  contacted_at timestamptz not null default now(),
  duree_minutes integer not null default 0 check (duree_minutes >= 0),
  notes text,
  a_recontacter_le timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists contact_logs_client_idx on public.contact_logs(client_id, contacted_at desc);
alter table public.contact_logs enable row level security;
drop policy if exists contact_logs_admin_all on public.contact_logs;
create policy contact_logs_admin_all on public.contact_logs for all using (is_admin()) with check (is_admin());

-- Liste d'attente = demande de contact particulier reçue pendant que le bandeau « complet » est actif
alter table public.clients add column if not exists liste_attente_depuis timestamptz;
update public.clients set liste_attente_depuis = created_at
  where type_client = 'Particulier' and client_status = 'Prospect'
    and created_at >= '2026-08-24' and liste_attente_depuis is null;

-- ===== Lot 5 : RDV 1 daté + confirmation / début d'accompagnement =====
alter table public.clients
  add column if not exists rdv1_date date,
  add column if not exists rdv1_heure text check (rdv1_heure ~ '^\d{2}:\d{2}$'),
  add column if not exists accompagnement_confirme boolean,
  add column if not exists accompagnement_confirme_at timestamptz;
insert into public.procedure_types (code, label) values
  ('CONFIRMATION_ACCOMPAGNEMENT', 'Confirmation accompagnement'),
  ('DEBUT_ACCOMPAGNEMENT', 'Début accompagnement'),
  ('PREPARATION_ACCOMPAGNEMENT', 'Préparation accompagnement')
on conflict (code) do nothing;

-- ===== Lot 6 : versions de contrat =====
alter table public.procedures add column if not exists annee_scolaire text;
-- Seuil unique : à partir de juin, on contractualise l'année scolaire suivante
update public.procedures p set annee_scolaire =
  case when extract(month from p.created_at) >= 6
    then extract(year from p.created_at)::int || '-' || (extract(year from p.created_at)::int + 1)
    else (extract(year from p.created_at)::int - 1) || '-' || extract(year from p.created_at)::int end
  from public.procedure_types t
  where p.procedure_type_id = t.id and t.code like 'CONTRACTUALISATION%' and p.annee_scolaire is null;

-- ===== Lot 7 : recueil — neuroatypie + situation familiale =====
alter table public.clients
  add column if not exists troubles_apprentissage text[],
  add column if not exists troubles_autre text,
  add column if not exists suivi_psy boolean,
  add column if not exists aise_avec_diagnostics boolean,
  add column if not exists date_dernier_diagnostic date,
  add column if not exists situation_familiale text;

-- ===== Lot 8 : préparation accompagnement / synthèse des disponibilités =====
alter table public.clients
  add column if not exists disponibilites jsonb
    check (disponibilites is null or jsonb_typeof(disponibilites) = 'array'),
  add column if not exists contraintes_extrascolaires text;
comment on column public.clients.disponibilites is 'Créneaux souhaités : [{"jour":"Lundi","debut":"17:00","fin":"19:00"}]';

-- ===== Lot 9 : signatures des documents de fin de contrat =====
alter table public.documents
  add column if not exists docuseal_submission_id text,
  add column if not exists signed_at timestamptz;

-- ===== Enum (en dernier : la nouvelle valeur n'est pas utilisée dans ce script) =====
alter type public.procedure_status_label add value if not exists 'SIGNATURE_ANNULEE';
