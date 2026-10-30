# A Rythme Ethic — project guide

Website and back-office of **Florence Louazel** ("Flo"), freelance math tutor in Nantes: private lessons for
young people (paid by the family through **CESU**, so Florence is the family's employee) and paid interventions
in schools / training centres ("Établissements", billed through a service contract).

Three surfaces:
- **Public site** (`arythmeethic.fr`): landing page, formations, contact form, reviews.
- **Back-office `/admin`**: CRM used daily by Florence (clients, procedures, hours, templates). Only two accounts: Florence and Thomas.
- **Public token forms** (`/formulaire/*`, `/download/*`): links emailed to families / schools.

Thomas owns the repo and drives the work; Florence is the end user. Backlog and meeting notes: **`TODO.md`** (read it at the start of a session).

---

## 1. Working rules (from Thomas)

- **Talk to Thomas in French.** Code comments in French, commit messages in English (`feat(scope): …`, `fix(crm): …`), matching the existing style.
- **Plan first**: when Thomas sends notes or requests, analyse and propose; **do not write code before his "go"**.
- **No branches, no PRs**: commit and push **directly to `main`**. A push to `main` = a Vercel production deploy.
- **SQL migrations**: `database/schema.sql` is **obsolete**. Real state = schema.sql + `database/migration-*.sql` + changes applied by hand.
  Use the Supabase MCP when available (`list_tables`, `apply_migration`, `get_advisors`); the desktop Code tab may silently refuse the elicitation → write the SQL, Thomas pastes it in the **Supabase SQL Editor**.
  **Never push code that uses a new column before Thomas confirms the migration ran** (prod would crash on the missing column).
- **Say no / "I don't know"** when something is infeasible, too complex or unverified. Never claim a check you did not run.
- **Brand**: Chakra `brand` / `accent` colours (`app/theme.ts`); every email goes through `renderEmailShell` (sand gradient header, `#2ba1bd` button).
- Opportunistic refactoring is fine. `// ponytail:` comment = deliberate simplification / known debt.
- **Never commit family files** (uploaded PDFs contain personal data, social security numbers…). Tests use synthetic PDFs.

### Guardrails (`.claude/settings.json` → `.claude/hooks/guard-bash.mjs`)
- `git add -A` / `--all` / `.` is **blocked**: stage files by name.
- `git push` first runs `tsc` + every `lib/*.check.mjs`; the push is blocked if one fails.

### Checks before pushing
```bash
npx tsc --noEmit -p .                     # if it complains about .next/types/…, delete .next/types (stale cache)
npx next lint --file <changed files>      # prettier warnings already exist elsewhere
node lib/heures-report.check.mjs          # self-tests (Node ≥ 22.18: native TS type stripping)
node lib/format.check.mjs
node lib/validators.check.mjs
node lib/fin-de-contrat-spots.check.mjs
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy \
  SUPABASE_SERVICE_ROLE_KEY=dummy npx next build   # build fails without these vars
```

---

## 2. Stack

Next.js **15.0.5** (App Router) · React 18 · TypeScript · **Chakra UI v2** · zod · **Supabase** (Postgres + RLS + Auth + private Storage bucket `client-files`) ·
**Vercel** (hosting + crons in `vercel.json`) · **Brevo** (transactional email + one SMS) · **DocuSeal** (e-signature) ·
**pdf-lib** + fontkit (PDF generation) · **unpdf** (reading uploaded PDFs) · **TipTap** (rich-text editor).

Env vars (names only): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `DOCUSEAL_API_KEY`, `CRON_SECRET` (optional, **not set** → crons are public),
`NEXT_PUBLIC_BASE_URL` / `NEXT_PUBLIC_SITE_URL` (same thing, both default to `https://arythmeethic.fr`; fin de contrat uses `SITE_URL`, the rest `BASE_URL`),
`GOOGLE_REVIEW_URL`, `FLORENCE_NOTIF_EMAIL`. Only the Supabase ones are zod-validated (`lib/env.ts`).

---

## 3. Layout

```
app/
  page.tsx, formations/, download/[token]/, robots.ts, sitemap.ts   public site
  formulaire/*                                                      public token forms
  admin/*                                                           back-office (see §8)
  api/procedures/*        admin actions that launch procedures
  api/formulaire/*        public form submissions
  api/cron/*              Vercel crons
  api/heures-realisees/recap-email, api/settings, api/contact, api/google-reviews,
  api/formations, api/download, api/storage/upload, auth/callback
lib/        business logic (procedures, signatures, relances, heures, PDFs, emails, validators)
types/index.ts  TS mirror of the DB (Client, Procedure, enums, labels)
components/  AdminShell (admin menu), RichTextEditor, SiteMessages, ContactModal, GoogleReviewsCarousel…
database/   schema.sql (obsolete) + migration-*.sql
docs/       contrat-articles-editables.md, migration-yousign-docuseal.md, reviews-section.md
```

Key files:
- **Client page**: `app/admin/clients/[id]/page.tsx` (~4400 lines, client component) + `lib/hooks/useClientDetail.ts` (data loading, history labels, contract versions). Procedure launch buttons are in the "Historique des procédures" card; most modals are inline in `page.tsx`, the accompagnement ones in `AccompagnementModals.tsx`.
- **Auth**: `middleware.ts` (matcher `/admin/*`, `/api/*`). No session → `/api` returns 401, `/admin` redirects to login, except:
  - `PUBLIC_API`: `/api/contact`, `/api/formulaire/*`, `/api/download`, `/api/cron/*`, `/api/storage/upload`, `GET /api/google-reviews`;
  - `PUBLIC_ADMIN_PAGES` (`lib/auth.ts`): login, forgot-password, reset-password.
  - ⚠️ It checks the **session, not the admin role** (open audit item).
- **Supabase clients**: `lib/supabase-server.ts` (`createClient` = cookie session; `createServiceRoleClient` = bypasses RLS, server only, used by nearly every API route) and `lib/supabase-client.ts` (browser, RLS `is_admin()`).

---

## 4. Data model

### `clients` (one table for both client types; TS: `Client` in `types/index.ts`)
- `type_client`: **`Particulier`** | **`École`** (shown as "Établissement" in the UI).
- `sub_type` (Particulier only): `Jeune` | `Parent`, i.e. who made first contact.
- `client_status`: `Prospect` → `Client` → `Archivé` (+ `archived_at`). Admin list tabs: prospects / clients / archives.
  The only automatic transition is "Oui" to *Confirmation accompagnement* → `Client`. Archive / unarchive is a button on the client page.
- Main contact: `first_name, last_name, email, phone1, organisation, address_line1, postal_code, city, country, notes`.

**Particulier fields**
- Family: `*_jeune`, `*_parent1`, `*_parent2` (first_name, last_name, email, phone). **Parent 1 = the administrative parent and the default recipient of everything.**
- From the contact form: `niveau_eleve`, `demande_type`, `how_did_you_hear`, `referrer_name`, `demarche_volontaire`.
- From the recueil: `numero_cesu`, `adresse_cours`, `etablissement_scolaire`, `moyenne_maths`, `moyenne_generale`, `jours_disponibles[]`, `situation_familiale` (`"<choice> — <details>"`, `splitSituation` / `joinSituation`).
- **Health data** (confidential, never copied on client duplication): `troubles_apprentissage[]`, `troubles_autre`, `suivi_psy`, `aise_avec_diagnostics`, `date_dernier_diagnostic`.
- Billing: `tarif_horaire`, `distance_km`, `mode_facturation` (`CESU` | `Ponctuel`).
- Pipeline: `liste_attente_depuis`, `rdv1_date` / `rdv1_heure`, `accompagnement_confirme(_at)`, `disponibilites jsonb [{jour,debut,fin}]`, `contraintes_extrascolaires`, `renouvellement_*` (souhaite, commentaire, date_reponse, token, token_expires_at, dernier_email_at).
- `form_token` / `form_token_expires_at`: recueil token (also used for schools).

**École fields (`ecole_*`)**
- Identity: SIRET, NDA (+ region), legal status.
- Costs covered by the school: lunch amount / conditions, travel reimbursed, km price.
- Five contact persons, each with nom / prenom / email / phone: `resp_modules_*` (+ `peut_negocier`), `resp_autorisation_*` (pricing approval), `resp_facturation_*`, `resp_planning_*`, `resp_notes_*` (+ `notes_saisies_par`).
- Module: name, hours, `formation_type` (initiale en alternance | continue), classes, group size, evaluation, period. Teacher name / email.
- Billing: `facturation_date_max_paiement`, `periode_facturation`.

### `procedures` (one row per launched procedure)
`id, client_id, procedure_type_id → procedure_types.code, status, docuseal_submission_id, deadline_at, signed_at, annee_scolaire, download_token(_expires_at), recipient_email, relances_stoppees, created_at, updated_at`.
- `status` (enum `proc_status`): `DRAFT | PDF_GENERATED | SIGN_REQUESTED | SIGNED | REFUSED | EXPIRED | CLOSED`.
  Reused loosely: **`SIGNED` = form answered** for non-signature procedures, `PDF_GENERATED` = form filled / email sent (recueil, CV/casier).
- `deadline_at` meaning depends on the type: RDV date (RDV1), 1st lesson date (Début), planned reminder date (Préparation accompagnement).
- History: `procedure_status_history` with enum `procedure_status_label`: `MAIL_ENVOYE, FORMULAIRE_REMPLI, RELANCE_ENVOYEE, MAIL_AVIS_GOOGLE_ENVOYE, RELANCE_AVIS_GOOGLE_ENVOYEE (unused), SIGNATURE_DEMANDEE, SIGNATURE_EFFECTUEE, SIGNATURE_REFUSEE, SIGNATURE_ANNULEE`. French labels: `statusLabels` in `types/index.ts`.

### Other tables
- `documents`: files linked to a client and/or procedure (`storage_path`, `original_filename`, `uploaded_by` ADMIN | CLIENT | EMAIL; in practice always `kind = SUPPORTING_DOC`; `docuseal_submission_id` + `signed_at` for fin de contrat).
- `heures_realisees` (see §7), `contact_logs` (calls / emails / SMS log, "à recontacter le"), `audit_log`, `email_templates`, `site_messages` (popup / banner), `settings` (only key: `bareme_km`, service role only), `formations`, `google_reviews`, `profiles` (role).

### Storage (private bucket `client-files`)
| Path | Written by |
|---|---|
| `clients/{clientId}/…` | admin "Ajouter un document" |
| `recueil/{clientId}/…` | recueil uploads (timetable, assessments) |
| `preparation-accompagnement/{clientId}/…pdf` | timetable from the préparation form |
| `fin-de-contrat/{clientId}/{procId}/{Kind}-…pdf` (`-signe_…` once signed) | fin de contrat uploads |
| `procedure/{procId}/…` | CV / criminal record (via `/api/storage/upload`) |

Contract PDFs are **not stored**: they are generated, sent to DocuSeal, and the signed copy is streamed from DocuSeal on demand.
Large uploads go through signed upload URLs (`signedUploadUrl` in `lib/procedures.ts`, direct browser → Storage, rough cap of 12 files / folder / 7 days) to avoid Vercel's 4.5 MB body limit.

---

## 5. Procedures

### Common mechanics
- **`lib/procedures.ts` `launchProcedure()`** (newer procedures): inserts the procedure as DRAFT → sends the Brevo email → writes `MAIL_ENVOYE`; **deletes the procedure if the email fails**. Options: `closePreviousDrafts` (older DRAFTs of the same type → CLOSED), `exclusiveSince` (anti double-send for crons).
  Older routes (recueil, souhait-renouvellement, fin de contrat, CV/casier) still insert + send inline and do **not** roll back on email failure.
- `familyContact(client, 'parent1'|'parent2'|'jeune')` re-reads the recipient from the DB (never trusts the browser).
- **Token forms**: 64-hex token, stored in `procedures.download_token` (or `clients.form_token` / `renouvellement_token` for older flows). `findDraftProcedure(token, code)` checks type, DRAFT status and expiry; an already-answered form returns 410.
- Most admin modals let Florence choose the recipient: Parent 1 / Parent 2 / Jeune (Particulier) or main contact / any `resp_*` (École).

### Particulier journey
```
Contact form (Prospect, maybe waiting list)
 → Recueil d'informations → Préparation RDV 1 → Confirmation accompagnement (Oui ⇒ Client)
 → Contractualisation (CESU fixed-term contract, DocuSeal) → Préparation accompagnement (timetable, Aug. campaign)
 → Début accompagnement → monthly hours declarations (recap to the parent)
 → Souhait de renouvellement (June) → Oui: next school year / Non: Fin de contrat
```

### École journey
```
Contact form (Prospect) → Recueil d'informations école → Contractualisation (service contract, DocuSeal) → Envoi CV / casier judiciaire
```

| Code (`procedure_types.code`) | Client | Trigger | Public form | Auto reminders |
|---|---|---|---|---|
| `RECUEIL_INFORMATIONS` | both | button | yes (2 variants) | no |
| `PREPARATION_RDV1` | Particulier | button | no | no |
| `CONFIRMATION_ACCOMPAGNEMENT` | Particulier | button | yes (Oui / Non) | no |
| `CONTRACTUALISATION` | both (one code) | button | DocuSeal | yes |
| `PREPARATION_ACCOMPAGNEMENT` | Particulier | button / cron 20 Aug | yes | 1 reminder |
| `DEBUT_ACCOMPAGNEMENT` | Particulier | button | no | no |
| `SOUHAIT_RENOUVELLEMENT` | Particulier | button / cron 15 June | yes (Oui / Non) | weekly |
| `FIN_DE_CONTRAT` | Particulier | button / "Non" to renewal | yes (3 uploads) + DocuSeal | yes |
| `ENVOI_CV_CASIER` | École | button | download page | no |

#### Contact form & waiting list (`app/api/contact/route.ts`, public)
- Creates a `Prospect`:
  - `student` → Particulier / Jeune;
  - `parent` → Particulier / Parent (fills parent 1);
  - `school` → École.
- Emails Florence (template `contact-notif`). If the insert fails it still sends the email.
- **Waiting list**: for parent / student, if the `site_messages` **banner** is enabled, sets `liste_attente_depuis = now` (TODO F1: give it its own switch).
  `/admin/liste-attente` lists them oldest first ("Retirer" clears the field); the client page shows "Liste d'attente #rank" or a "Mettre en liste d'attente" button.

#### Recueil d'informations (`api/procedures/recueil-informations`)
- **Launch**:
  - generates `clients.form_token` (7 days);
  - inserts DRAFT + `MAIL_ENVOYE`;
  - emails `recueil-informations` with a link to `/formulaire/recueil-informations` or `/formulaire/recueil-informations-ecole`;
  - **also sends an SMS** (Brevo transactional SMS, sender `ARythmeEth`) to the matching phone.
- **Particulier form**:
  - Collects: legal guardians, contacts (parent 2 only if "both parents"), **"who handles the paperwork?"**, CESU number, level, school, grades, lesson address, available days, optional timetable, learning disorders / psy follow-up / assessments (health consent required if declared).
  - **If parent 2 is the administrative parent, parent 1 and parent 2 are swapped** so that Parent 1 is always the administrative one.
  - Uploads are checked (path, MIME type, ≤ 15 MB, max 6) and stored as `documents`. The token is single use.
  - Procedure → `PDF_GENERATED` + `FORMULAIRE_REMPLI`. The audit log records that consent was given, never health values.
- **École form**: identity, costs, the 5 contact persons, module, teacher, billing. Same completion.

#### Préparation RDV 1 (`api/procedures/preparation-rdv1`)
- Modal: date + time of the first meeting + recipient. Saves `rdv1_date` / `rdv1_heure`; `deadline_at` = the RDV date.
- Template `preparation-rdv1` (documents to bring); a date box is appended if the template has no `{{rdvDate}}`.
- Informational only.

#### Confirmation accompagnement (`api/procedures/confirmation-accompagnement`)
- Token valid 30 days; template `confirmation-accompagnement`; form `/formulaire/confirmation-accompagnement/{token}` with **Oui / Non**.
- **On answer**:
  - sets `accompagnement_confirme(_at)`;
  - **Oui ⇒ `client_status = Client`**;
  - procedure → `SIGNED` + `FORMULAIRE_REMPLI`.
- Shown as the "Souhait d'accompagnement" card on the client page.

#### Contractualisation (`api/procedures/contractualisation-{particulier,ecole}`)
- **Particulier: CESU fixed-term contract** (`lib/pdf-contract-particulier-generator.ts`)
  - Inputs: school year, start / end dates, net hourly wage, employer signer.
  - Florence is the employee, the family the employer.
- **École: service contract** (`lib/pdf-contract-generator.ts`)
  - Inputs: school year, hourly rate excl. tax, optional PDF annexes (merged), signer.
  - **Articles editable before sending** (`lib/contract-ecole-articles.ts`, `docs/contrat-articles-editables.md`; mini-markup in `lib/pdf-rich-text.ts`: `**bold**`, `!red`, `- bullet`).
- Both have a **preview** route. School-year options: current and next (`anneeScolaire()`, switches in June).
- **Flow**:
  1. Generate the PDF.
  2. Insert the procedure (DRAFT).
  3. DocuSeal submission with signers **Client + Florence** (parallel; DocuSeal emails both).
  4. Brevo email with the signing link (template for the client, hard-coded for Florence).
  5. Procedure → `SIGN_REQUESTED` + `SIGNATURE_DEMANDEE`. On a DocuSeal error the procedure goes back to DRAFT.
- **Versions V{n}**: a new contract for the same client and school year supersedes the previous one (`supersedePreviousContracts`).
  - A pending previous version is archived in DocuSeal and becomes CLOSED + `SIGNATURE_ANNULEE`.
  - A signed previous version becomes CLOSED with no history entry.
  - "V{n}" is displayed only when a year has ≥ 2 versions (history + "Contrats signés" card).
- **Status sync**: see §6. "Télécharger le contrat signé" streams the signed PDF from DocuSeal.
- **"Annuler la signature"**: archives the submission → CLOSED. Final; Florence sends a new version instead.

#### Préparation accompagnement (`lib/preparation-accompagnement.ts`)
- **Always sent to Parent 1.** Collects the new school year's weekly availability + extracurricular constraints + **required timetable PDF**.
- Launched by:
  - the client-page button;
  - `/admin/disponibilites` ("Synthèse des disponibilités");
  - the **20–31 August campaign** (cron) for every Particulier `Client` with a parent 1 email who confirmed the accompagnement or the renewal (and didn't say No), with no request since 1 June.
- `deadline_at` = **2nd Friday of September** (or launch + 7 days if later); one reminder is sent on that date.
- **On answer**: overwrites `disponibilites` / `jours_disponibles` / `contraintes_extrascolaires`, stores the timetable document, procedure → `SIGNED`.
- `/admin/disponibilites` shows a weekly grid of all families plus who answered, with a "Relancer" button.

#### Début accompagnement (`api/procedures/debut-accompagnement`)
- Checkboxes parent1 / parent2 / jeune + optional first lesson date / time.
- One email to all of them (template `debut-accompagnement`, `{{#premierCours}}` section shown only if a date is given). No form.

#### Souhait de renouvellement (renewal)
- **Launch**:
  - manual button, or the **cron on 15 June** (all Particulier `Client`s who haven't answered this year);
  - `clients.renouvellement_token` (30 days), resets the previous answer;
  - form `/formulaire/renouvellement?token=` → **Oui / Non + comment**.
- **On answer**:
  - stores `renouvellement_*`, procedure → `SIGNED`;
  - sends the **thank-you + Google review request** (`renouvellement-accuse`, `MAIL_AVIS_GOOGLE_ENVOYE`);
  - **if Non → automatically launches Fin de contrat**.
- **Reminders**: Fridays, if the last email is > 7 days old, until the token expires.
- `renouvellement_souhaite = true` makes the family eligible for the August préparation campaign.

#### Fin de contrat (`lib/fin-de-contrat.ts`, `lib/fin-de-contrat-signatures.ts`)
- **Launch**: button or "Non" to renewal (skipped if one is already in progress or signed this month). Token valid 60 days.
  Template `fin-de-contrat` explains the CESU steps.
- **Form `/formulaire/fin-de-contrat/{token}`**: the parent uploads **3 PDFs** generated on the CESU site:
  - **Reçu pour solde de tout compte**
  - **Attestation employeur** (France Travail)
  - **Certificat de travail**

  Each must be a real PDF (checked with unpdf), ≤ 20 MB; re-upload replaces it.
- **After the 3rd upload**: procedure → `SIGN_REQUESTED`; one DocuSeal submission per document. Signature boxes are placed by `lib/fin-de-contrat-spots.ts` (finds text anchors such as "SIGNATURE DE L'EMPLOYEUR", otherwise fixed positions from the Urssaf / France Travail models).
  - Attestation + certificat: **parent only**, links sent immediately.
  - Reçu pour solde: **Florence signs first**, then the parent (`order: 'preserved'`). The parent's link goes out when the daily cron sees Florence's signature (up to ~24 h delay).
  - The parent's DocuSeal emails are disabled: they only get our Brevo emails (`fin-de-contrat-signature`).
- **Daily follow-up (signatures cron)**: each signed PDF replaces the original in storage (`…-signe_…pdf`) and is emailed to the parent as an attachment (`fin-de-contrat-document-signe`).
  All 3 signed → `SIGNED`; any decline → `REFUSED`. Weekly signature reminder.
- **Upload-phase reminder**: every 3 days while documents are missing.

#### Envoi CV / casier judiciaire (École)
- Modal: recipient + files. Three steps, all run by the browser:
  1. Create the procedure (token valid 14 days).
  2. Upload each file through `/api/storage/upload`.
  3. Send the email (`envoi-cv-casier`) with a link to `/download/{token}`. That page lists the files with 1-hour signed URLs.
- Status → `PDF_GENERATED` + `MAIL_ENVOYE`. No reminders.

---

## 6. Integrations

### Brevo (`lib/brevo.ts`)
- `sendEmail({to[], subject, html, attachments?})` → `POST api.brevo.com/v3/smtp/email`.
  - Sender "A Rythme Ethic" <`BREVO_SENDER_EMAIL`>. Multiple recipients share one email. Attachments are base64.
  - **Never throws**: returns `{success, reason}`.
- Used by: contractualisation, signatures cron, `lib/procedures.ts`, préparation, fin de contrat signatures.
- **Legacy local copies** of the Brevo call still live in: contact, recueil-informations, envoi-cv-casier/send-email, souhait-renouvellement, formulaire/renouvellement, the 3 renouvellement / fin-de-contrat crons, `lib/fin-de-contrat.ts`, the hours recap route.
  Migrate them to `sendEmail` when touching them.
- **SMS**: only the recueil launch (`transactionalSMS/send`).

### DocuSeal (`lib/docuseal.ts`, `lib/signatures.ts`, API `api.docuseal.com`, header `X-Auth-Token`)
- **No DocuSeal templates**: always `POST /submissions/pdf` with our own PDF in base64. Signature fields come from pdf-lib coordinates converted by `toDocusealCoords`.
- `createSubmission` options: per-signer `sendEmail`, `order` (`random` = parallel / `preserved` = sequential), annexes merged.
  Other calls: `getSubmission`, `archiveSubmission` (DELETE = cancel), `signingLink(slug)` → `docuseal.com/s/{slug}`.
- **No webhook**: status is synced by the daily `/api/cron/signatures` (7 AM UTC) and when clicking "Télécharger le contrat signé".
  `syncContractSignature` maps:
  - all signed → `SIGNED` + `SIGNATURE_EFFECTUEE`;
  - declined → `REFUSED`;
  - archived → `CLOSED` + `SIGNATURE_ANNULEE`.

  Updates are conditional on `SIGN_REQUESTED` (idempotent); `dry` is supported.
- History: migrated from Yousign (`docs/migration-yousign-docuseal.md`).

### Supabase
- Postgres + RLS (`is_admin()` = `profiles.role = 'admin'`; new sign-ups get `user`).
- Auth: email / password, password reset, `app/auth/callback` (the `next` parameter only accepts internal paths).
- Storage: see §4.
- Supabase errors are **plain objects, not `Error`s** (see §10).

### PDF
- pdf-lib generators for both contracts (NotoSans fonts from `public/fonts` via fontkit), the monthly hours recap (`api/heures-realisees/recap-email`) and the formations list (`api/formations/pdf`).
- unpdf reads uploaded PDFs: validation + text anchors for the signature boxes.

### Vercel crons (`vercel.json`, UTC)
All are public (no `CRON_SECRET`) → written to be idempotent; `?dry=1` = simulation (only the signatures and préparation crons support it).

| Route | Schedule | Does |
|---|---|---|
| `/api/cron/signatures` | daily 07:00 | DocuSeal sync + contract reminders + fin de contrat signature follow-up |
| `/api/cron/preparation-accompagnement` | daily 16:00 | 20–31 Aug campaign + 2nd-Friday-of-Sept reminder |
| `/api/cron/fin-de-contrat-relance` | 18:00 on days 1, 4, 7… (`*/3`) | reminder for missing fin de contrat uploads |
| `/api/cron/renouvellement-relance` | Fridays 16:00 | renewal reminder |
| `/api/cron/renouvellement-envoi` | 15 June 09:00 | renewal campaign (**not idempotent**: a second run creates new tokens / procedures) |

### Others
- **Google reviews**: no Google API. The `google_reviews` table is curated by hand in `/admin/avis` and shown in a carousel on the home page.
- **TipTap**: `components/RichTextEditor.tsx`, used by the email template editor.

---

## 7. Specific mechanisms

### Relances (automatic reminders)
- `lib/relances.ts` `hasAutoRelances(proc)` says which procedures have reminders (and therefore the **Stopper / Reprendre les relances** button):
  - `CONTRACTUALISATION` when `SIGN_REQUESTED`;
  - `FIN_DE_CONTRAT` when `DRAFT` (uploads missing) or `SIGN_REQUESTED`;
  - `SOUHAIT_RENOUVELLEMENT` when `DRAFT`;
  - `PREPARATION_ACCOMPAGNEMENT` when `DRAFT` with a `deadline_at`.
- `canCancelSignature`: contract with a pending submission.
- **Stopping** sets `procedures.relances_stoppees = true`. The link stays valid and **every cron respects the flag** (signed fin de contrat PDFs are still collected, just no emails).
  Route: `POST /api/procedures/[id]/relances` `{action: stop | resume | cancel-signature}`. The buttons sit on the latest history entry of the client page.

| Flow | Cadence |
|---|---|
| École contract | every ≥ 3 days, weekdays only (counted from the last request / reminder) |
| Particulier contract | every 7 days |
| Contract (both) | only the latest version per client and year; skipped if only Florence is missing or the school year is over |
| Fin de contrat, uploads missing | every 3 days |
| Fin de contrat, signatures | every 7 days |
| Renewal | Fridays, if > 7 days since the last email, until the token expires (30 days) |
| Préparation accompagnement | one reminder on the 2nd Friday of Sept (or launch + 7 days) |

Double-send guards:
- contracts and fin de contrat claim the procedure by a conditional update of `updated_at` (rejected if the last update is < 20 h old);
- préparation claims by setting `deadline_at` to null (restored if Brevo fails);
- the August campaign uses `exclusiveSince`.

### Email templates (Florence can edit them)
- **Registry** `lib/email-templates.ts` (`EMAIL_TEMPLATES`: key, name, description, variables) + defaults in `DEFAULT_TEMPLATE_CONTENT`. Overrides live in table `email_templates(key, subject, html)`; no row = default.
- **Editor**: `/admin/email-templates/[key]` (subject + TipTap; load default / save / reset).
- **Syntax**: `{{var}}`; `{{#var}}…{{/var}}` keeps the block only if `var` is non-empty (`substituteVars`, raw HTML).
- **Server** (`lib/email-templates-server.ts`, never throws):
  - new code: `getEmailTemplate(key)` + `renderTemplate(t, vars, dynamicBlock)` → `{subject, html}` wrapped in the shell;
  - legacy routes: `getEmailTemplateOverride(key, vars)` returns null when there is no override, and the route then uses its hard-coded HTML.
- **Design**: `renderEmailShell(html, dynamicBlock)` gives a 600 px card with a sand gradient header (Georgia, `#6e3a25`), body `#7b4a31` and a footer. Helpers: `emailButton` (`#2ba1bd`), `signatureLinkBlock`.
  The dynamic block (button, link, amounts table) is appended by the code, so Florence can't break it.
- **Keys**:
  - Contact, recueil, RDV, accompagnement: `contact-notif`, `recueil-informations`, `preparation-rdv1`, `confirmation-accompagnement`, `debut-accompagnement`, `preparation-accompagnement(-relance)`.
  - Contracts and school: `contractualisation-{particulier,ecole}(-relance)`, `envoi-cv-casier`.
  - Renewal: `souhait-renouvellement`, `renouvellement-accuse`, `cron-renouvellement-envoi`, `cron-renouvellement-relance`.
  - Fin de contrat: `fin-de-contrat`, `cron-fin-de-contrat-relance`, `fin-de-contrat-signature(-relance)`, `fin-de-contrat-document-signe`.
  - Hours: `recap-heures`.

### Hours / CESU (`lib/heures-report.ts`, pure, values in hundredths of an hour)
- `heures_realisees` holds one row per client per month (`mois` = YYYY-MM-01). Columns:
  - `heures`, `heures_annulation`, `tarif_horaire`, `km`, `bareme_km`;
  - `temps_a_reporter`, `report_in`;
  - `premier_rdv_heures`, `premier_rdv_date`;
  - `sans_declaration`, `salaire_recu_le`;
  - `recap_email_sent_at`, `recap_email_to`.
- **Carry-over counter** (`computeReports`):
  - each month adds its `temps_a_reporter`;
  - a declared month bills the **whole hours** and keeps the remainder (< 1 h) in the counter;
  - it is capped by later months' balances, so sending months out of order never bills hours twice;
  - `report_in` NULL = forecast (recomputed), a number = frozen;
  - `sans_declaration` months never absorb the counter.
- `heuresFacturees` = hours + carry-over + 1st RDV (cancellations are billed as a separate line).
- **1st RDV**: billed on the month it is entered, at its exact duration, outside the counter (⚠️ TODO C2 changes this: whole hours billed, the rest to the counter).
- **Monthly recap** (`api/heures-realisees/recap-email`): amounts are **re-read from the DB**, never trusted from the browser.
  It generates a PDF (hours, carry-over, 1st RDV, cancellations, km, total) and emails `recap-heures` to the parent with the PDF attached, then freezes `report_in` and stores `recap_email_sent_at` / `_to`. The km rate comes from `settings.bareme_km`.
- **UI**:
  - `HeuresRealiséesModal` (enter / edit a month, live forecast);
  - `SendRecapModal` (send / resend one month, or "update the counter without email");
  - `DeclarerHeuresModal` (batch send from the client list);
  - `/admin/suivi-cesu` (monthly grid: to declare → recap sent → salary received → ok; `sans_declaration` checkbox; inline salary date).

---

## 8. Admin sections (`components/AdminShell.tsx`)
| Page | Purpose |
|---|---|
| `/admin/clients` | Prospects / Clients / Archives list, new client, batch hours send, km rate setting |
| `/admin/clients/[id]` | client page: contact info, family, school info, procedures + history, documents, hours, contact log, contracts |
| `/admin/liste-attente` | waiting list (oldest first) |
| `/admin/suivi-contacts` | `contact_logs` history (canal, duration, call-back date) |
| `/admin/suivi-cesu` | monthly CESU declaration tracking |
| `/admin/disponibilites` | Synthèse des disponibilités (préparation accompagnement answers) |
| `/admin/avis` | Google reviews shown on the site |
| `/admin/formations` | formations shown on `/formations` (+ PDF export) |
| `/admin/bandeaux` | site popup + banner (`site_messages`) |
| `/admin/email-templates` | email templates |

---

## 9. Self-tests (`lib/*.check.mjs`, `node:assert`, no framework)
- `heures-report`: carry-over counter rules (float drift, whole hours, out-of-order months, frozen values, 1st RDV, `sans_declaration`).
- `format`: French dates, `anneeScolaire`, Paris timezone, campaign start date, 2nd-Friday reminder date, `substituteVars`.
- `validators`: phone normalisation, duplicate contacts, recueil contact errors, upload extensions / MIME types, situation split / join, availability parsing.
- `fin-de-contrat-spots`: signature box placement on synthetic PDFs (anchors, fallback, page bounds).

Add a case when you change one of these modules.

---

## 10. Known pitfalls & gaps
- Supabase errors are plain objects, not `Error` (`instanceof Error` hides them): see `fetchErrorMessage` in `useClientDetail.ts`.
- An `Error`'s `message` is not enumerable: don't spread an error to copy it.
- Vercel limits request bodies to 4.5 MB: use signed upload URLs.
- Supabase returns at most 1 000 rows per query by default.
- The repo SQL is incomplete. Added by hand / MCP, with no migration file:
  - several history enum values;
  - procedure codes (`FIN_DE_CONTRAT`, `ENVOI_CV_CASIER`; the seed still says `FIN_CONTRAT`);
  - `procedures.relances_stoppees`, `download_token`, `recipient_email`;
  - `is_admin()`.

  Check the live DB before assuming.
- `/api/formulaire/recueil-informations-ecole` does not check `type_client` on the token.
- `/api/storage/upload` is public and writes with the service role (audit item #1).
- The fin-de-contrat-relance cron uses `*/3` on the day of month (restarts on the 1st).
- `npm run seed` points to `scripts/seed.mjs`, which does not exist.

---

## 11. Status (30/10/2026)

**Delivered** (all on `main`):
- Batches 1–9 of the October meeting: waiting list, contact tracking, CESU tracking, availability summary, reorganised client pages, carry-over counter, RDV1 / confirmation / préparation / début procedures, neurodiversity + administrative parent + family situation in the recueil, contract versions, fin de contrat DocuSeal signatures.
- 1st RDV billed on the chosen month.
- Stop / resume reminders + cancel signature.
- Real Supabase error messages on the client page.

**Not yet tested for real**:
- The full fin de contrat signature path (check that the parent doesn't receive the DocuSeal email twice).
- October recap with the 1st RDV line (Hélène WATTEZ 1.47 h, Vanessa Bulan 1.73 h).

**Next**: see `TODO.md`:
- 29/10 meeting, blocks A–F: quick fixes, contract reviewer for schools, bulk actions in Suivi CESU, 1st RDV whole hours, normalised address, waiting-list switch, Partenaires and Ressources Lycée / Collège pages, CMS.
- 19/10 security / perf audit. Priorities: `CRON_SECRET` on Vercel, close `/api/storage/upload`, `requireAdmin()`, idempotent renouvellement-envoi, Next.js upgrade.
