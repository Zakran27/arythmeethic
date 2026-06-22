# TODO

> ⚠️ **Pour la DB : utiliser le MCP Supabase, PAS `database/schema.sql`** (le fichier local n'est pas toujours à jour vs. la DB réelle — ex. `heures_realisees` créée directement dans Supabase).
> - `mcp__supabase__list_tables` / `execute_sql` (`_read_only`) / `apply_migration` / `get_advisors` (après chaque migration).

---

## Contexte projet (repères pour les futures tâches)

- **Stack** : Next.js 15 (App Router), Chakra UI, Supabase (PostgreSQL), TypeScript. Déployé sur **Vercel** (auto-deploy à chaque push sur `main` — pas de branches). Textes utilisateur en **français**. Vérifier `npm run build` avant de pousser (Vercel échoue sur erreurs ESLint/TS, mais ne promeut jamais un build échoué).
- **Sections déjà dynamiques — NE PAS refaire** : avis Google (`/admin/avis`, table `google_reviews`), formations (`/admin/formations`).
- **CRM clients** : `app/admin/clients/` — liste `page.tsx` (onglets Prospects / Clients / Archivés via `?tab=`), fiche `[id]/page.tsx` (Retour / Modifier / Archiver / Supprimer), modales `NewClientModal`, `[id]/EditClientModal`, `HeuresRealiséesModal` (déclaration d'heures, avec cas d'annulation), `[id]/SendRecapModal`, table `ClientsTable`. Types dans `types/index.ts` (`ClientStatus = 'Prospect' | 'Client' | 'Archivé'`, `archived_at`, `adresse_cours`, `ecole_*` dont `ecole_formation_type`).
- **Validation formulaires** : `lib/validators.ts` (`isValidEmail`, `isValidPhone`, `findInvalidContactFields`) — branché au submit NewClient/EditClient + inline `ContactModal`. Affichage tél via `lib/format.ts`.
- **Heures réalisées** : table `heures_realisees` (hors `schema.sql` ; colonnes `heures`, `report_in`, `tarif_horaire`, `temps_a_reporter`, `km`, `bareme_km`, `heures_annulation`, `recap_email_*`). Récap email/PDF par client via `app/api/heures-realisees/recap-email/route.ts` + `SendRecapModal` (gère cumul du report + heures d'annulation).
- **Contrats PDF** : `lib/pdf-contract-generator.ts` (établissement — imprime le type de formation à l'Article 2) et `lib/pdf-contract-particulier-generator.ts` (particulier). Génération + preview via `app/api/procedures/contractualisation-{ecole,particulier}/` (mêmes générateurs).
- **Emails (~13 templates HTML inline)** : routes `app/api/procedures/*`, `app/api/cron/*`, `lib/fin-de-contrat.ts`, `recap-email`. Envoi via **Brevo** (`BREVO_SENDER_EMAIL`). Notif Florence uniquement sur « Prendre contact » (`app/api/contact/route.ts`). Salutations particuliers = prénom seul.
- **Éditeur de templates emails** (rich-text) : table `email_templates(key, subject, html)` où `html` = **corps éditable** (sortie TipTap, PAS le HTML complet). `lib/email-templates.ts` (client-safe : registre `EMAIL_TEMPLATES`, `substituteVars`, `renderEmailShell` = habillage de marque auto, `DEFAULT_TEMPLATE_CONTENT`) + `lib/email-templates-server.ts` (`getEmailTemplateOverride`, server-only). UI `/admin/email-templates` (+ `[key]`) avec éditeur `components/RichTextEditor.tsx` (TipTap). Florence édite seulement le texte ; en-tête/pied + blocs calculés (ex. tableau montants) injectés automatiquement. **Pattern de câblage d'une route** : `const ov = await getEmailTemplateOverride(key, vars); const html = ov ? renderEmailShell(ov.html, blocsCalculés) : defaultHtml; const subject = ov?.subject ?? defaultSubject;`. Seule `recap-heures` est câblée.
- **Auth admin** : pages `app/admin/login|forgot-password|reset-password/page.tsx` + `middleware.ts` (garde de session `@supabase/ssr`) + `lib/auth.ts`. ⚠️ Pas de `lib/hooks/useAuth.ts` (n'existe pas). Login revu le 22/06 : code correct (`signInWithPassword`, reset via `window.location.origin`). Si un souci mobile persiste → vérifier la config **Site URL / Redirect URLs** dans le dashboard Supabase Auth (pas un bug de code).
- **Site vitrine** : `components/Nav.tsx` a un lien « Formations suivies » → `/formations`. **Bandeaux/popups** : table `site_messages` (popup + bandeau, lecture publique), admin `/admin/bandeaux` (cases + message éditable), composant public `components/SiteMessages.tsx` monté en tête de `app/page.tsx`. Prod : domaine `arythmeethic.fr` (OVH/DNS), Vercel, M365, Brevo, Supabase, DocuSeal.
- **Reset password** (à régler côté dashboard Supabase, pas du code) : ajouter `https://www.arythmeethic.fr/admin/reset-password` + variante sans `www` aux **Redirect URLs**, vérifier la **Site URL**, et configurer un **SMTP custom (Brevo)** pour que les emails de reset partent. (Thomas s'en occupe.)

---

## 🟡 Item 12 (suite) — câbler les 10 templates emails restants

L'infra + l'UI **rich-text** sont faites, et **2 routes câblées** (récap + preparation-rdv1) prouvent le pattern (avec/sans bloc dynamique). Reste **10 routes**, **une par une**, en testant un **envoi réel Brevo** à chaque fois (non testable en local/CI → prudence).

Pour chaque route : (1) repérer le `subject`/`html` par défaut + les variables ; (2) ajouter le **corps par défaut** (texte simple, sans habillage) dans `DEFAULT_TEMPLATE_CONTENT` (`lib/email-templates.ts`) ; (3) `wired: true` dans `EMAIL_TEMPLATES` ; (4) dans la route : `const ov = await getEmailTemplateOverride(key, vars); const html = ov ? renderEmailShell(ov.html, blocsCalculés) : defaultHtml;` (+ `subject`) ; (5) tester l'envoi réel.

Routes restantes (clés du registre) : `contact-notif`, `recueil-informations`, `contractualisation-particulier`, `contractualisation-ecole`, `envoi-cv-casier`, `souhait-renouvellement`, `renouvellement-accuse`, `cron-renouvellement-envoi`, `cron-renouvellement-relance`, `cron-fin-de-contrat-relance`, `fin-de-contrat`.

---

## 🟡 Autonomie Florence — édition du site vitrine via /admin (gros chantier)

**Décision** : étendre `/admin` (Florence pas tech → pas de Git/MDX/CMS tiers). Réutiliser le pattern CRUD Supabase de `/admin/avis` et `/admin/formations`.

**Phases** :
1. **Scope** avec Florence (MVP probable : Hero + Présentation + Services + Process steps de `app/page.tsx`).
2. **Modèle de données** : table `site_content(section text PK, content jsonb, updated_at)` + schémas TS typés par section (`types/site-content.ts`).
3. **Admin UI** : `/admin/site/page.tsx` (liste) → `/admin/site/[section]/page.tsx` (édition, formulaires Chakra).
4. **Lecture publique** : `app/page.tsx` en RSC avec fetch Supabase + `revalidate: 60` + **fallback sur les valeurs actuelles** (zéro régression).
5. **Seed initial** avec les valeurs hardcodées actuelles.

**Sections candidates** (`app/page.tsx`) : Hero, Présentation Florence, Services (3 cartes), Matières enseignées (carousel), Process (`PARTICULIER_STEPS` / `ECOLE_STEPS`). Témoignages + Formations déjà dynamiques.

**Mot-clé reprise** : « on attaque l'autonomie Florence » / « on fait le CMS admin ».
