# TODO

> ⚠️ **Pour la DB : utiliser le MCP Supabase, PAS `database/schema.sql`** (le fichier local n'est pas toujours à jour vs. la DB réelle — ex. `heures_realisees` créée directement dans Supabase).
> - `mcp__supabase__list_tables` pour les tables/colonnes/contraintes réelles
> - `mcp__supabase__execute_sql` (`_read_only`) pour inspecter
> - `mcp__supabase__apply_migration` pour les changements de schéma
> - `mcp__supabase__get_advisors` après chaque migration (sécurité / perf)

---

## Contexte projet (repères pour les futures tâches)

- **Stack** : Next.js 15 (App Router), Chakra UI, Supabase (PostgreSQL), TypeScript. Déployé sur **Vercel** (auto-deploy à chaque push sur `main`). Textes utilisateur en **français**.
- **Sections déjà dynamiques — NE PAS refaire** : avis Google (`/admin/avis`, table `google_reviews`), formations (`/admin/formations`).
- **CRM clients** : `app/admin/clients/` — liste `page.tsx` (onglets Prospects / Clients / **Archivés**, pilotés par `?tab=`), fiche `[id]/page.tsx` (boutons Retour / Modifier / **Archiver** / Supprimer), modales `NewClientModal.tsx`, `[id]/EditClientModal.tsx`, modale de déclaration d'heures `HeuresRealiséesModal.tsx`, `[id]/SendRecapModal.tsx`, table `ClientsTable.tsx`. Type client dans `types/index.ts` (`ClientStatus = 'Prospect' | 'Client' | 'Archivé'`, `archived_at`, champ `adresse_cours`, champs `ecole_*` dont `ecole_formation_type`).
- **Validation formulaires** : `lib/validators.ts` (`isValidEmail`, `isValidPhone`, `findInvalidContactFields`) — branché au submit de NewClient/EditClient et inline dans `ContactModal`. Affichage tél via `lib/format.ts` (`formatPhone`).
- **Heures réalisées** : table Supabase `heures_realisees` (hors `schema.sql`, colonnes : `heures`, `report_in`, `tarif_horaire`, `temps_a_reporter`, `km`, `bareme_km`, `recap_email_*`). Récap email/PDF par client via `app/api/heures-realisees/recap-email/route.ts` + `SendRecapModal`. Le récap gère déjà le cumul du temps à reporter (« mois précédent »).
- **Contrats PDF** : `lib/pdf-contract-generator.ts` (établissement / contrat de prestation — imprime déjà le type de formation à l'Article 2) et `lib/pdf-contract-particulier-generator.ts` (particulier). Génération + preview via `app/api/procedures/contractualisation-{ecole,particulier}/` (mêmes générateurs → 1 seul endroit à modifier).
- **Emails (~13 templates HTML inline)** : routes `app/api/procedures/*`, `app/api/cron/*`, `lib/fin-de-contrat.ts`, `app/api/heures-realisees/recap-email`. Envoi via **Brevo** (`BREVO_SENDER_EMAIL` = `florence.louazel@arythmeethic.fr`). Notif à Florence uniquement sur le formulaire public « Prendre contact » (`app/api/contact/route.ts`).
- **Auth admin** : `lib/hooks/useAuth.ts` (Supabase auth) + pages `app/admin/login/page.tsx`, `app/admin/forgot-password/page.tsx`, `app/admin/reset-password/page.tsx`.
- **Site vitrine** : `components/Nav.tsx` a un lien « Formations suivies » → `/formations`. Mise en prod faite (domaine `arythmeethic.fr` OVH/DNS, Vercel, M365, Brevo, Supabase, DocuSeal).

---

## 🔴 Bug à corriger

### B1. Connexion mobile + « mot de passe oublié » KO sur mobile
**Signalé par Florence** : la connexion à `/admin` depuis un mobile ne fonctionne apparemment pas — et/ou le « mot de passe oublié » non plus sur mobile.
- **À reproduire d'abord** sur un vrai mobile (ou DevTools émulation mobile) pour identifier le symptôme exact (page qui ne charge pas ? bouton inactif ? redirection cassée ? lien de l'email de reset qui ne s'ouvre pas ?).
- **Pistes à investiguer** :
  - `app/admin/login/page.tsx` — layout/responsive, état du formulaire, gestion du submit.
  - `lib/hooks/useAuth.ts` — session/cookie Supabase, redirection après login.
  - `app/admin/forgot-password/page.tsx` + `app/admin/reset-password/page.tsx` — URL de redirection du mail de reset (doit pointer vers `https://arythmeethic.fr/...`), comportement du lien ouvert dans le navigateur mobile par défaut.
  - Vérifier les `redirectTo` passés à Supabase et la config Site URL / Redirect URLs côté Supabase Auth.

---

## 🟡 Retours Florence (call 28 mai 2026) — restants

### 8. Cas d'annulation dans la déclaration d'heures
Dans la modale de déclaration d'heures (`HeuresRealiséesModal.tsx`) : checkbox « Cas d'annulation » qui révèle un champ « Nombre d'heures à facturer en cas d'annulation ». Ces heures doivent apparaître dans le récap.
- **État vérifié** : aucune notion d'annulation dans le code des heures aujourd'hui.
- Migration (name `add_heures_annulation`) :
  ```sql
  ALTER TABLE heures_realisees ADD COLUMN IF NOT EXISTS heures_annulation numeric DEFAULT 0;
  ```
- Mettre à jour : le calcul du total facturé (`total += heures_annulation × tarif_horaire`), le tableau de la fiche (`app/admin/clients/[id]/page.tsx`, colonne « Annulation »), et le récap email/PDF (`recap-email/route.ts`) : ligne « Heures d'annulation facturées : Xh × Y€ ».

### 10. Uniformiser les salutations — prénom seul pour les particuliers
Tous les emails aux particuliers : salutation = **uniquement le prénom**.
- **État vérifié** : `renouvellement` et `recueil-informations` utilisent déjà le **prénom seul** ✅. Mais encore en « Prénom Nom » : `app/api/procedures/fin-de-contrat/route.ts:14` (`${prénom} ${nom}`) et les contractualisations (`toName` = nom complet du signataire). Récap heures (`recap-email`) = `Bonjour,` générique (à personnaliser).
- Stratégie : passer `firstName` seul partout (particuliers). Écoles : garder « Prénom Nom » a priori. ⚠️ Attention à ne pas casser le `toName` du signataire DocuSeal (qui doit rester le nom complet) — ne changer que la salutation du corps de l'email.

### 12. 🔨 GROS CHANTIER (différé) — Éditeur de templates emails dans l'admin
Onglet admin permettant à Florence d'éditer **tous les templates d'emails** (~13). Tous les emails sortants deviennent dynamiques. **Volontairement repoussé** (chantier lourd + risqué : touche les 13 emails de prod).
- **Architecture cible** : table `email_templates(key PK, name, subject, html, variables jsonb, updated_at)` ; pages `/admin/email-templates` (liste) + `/admin/email-templates/[key]` (édition subject+html, preview live, variables) ; helper `lib/email-templates.ts` (`getTemplate`, `renderTemplate` substitution `{{var}}`) ; refactor des 13 routes.
- **Les 13 templates** : contact, preparation-rdv1, recueil-informations, contractualisation-particulier, contractualisation-ecole, envoi-cv-casier, souhait-renouvellement, formulaire/renouvellement, cron/renouvellement-envoi, cron/renouvellement-relance, cron/fin-de-contrat-relance, lib/fin-de-contrat, heures-realisees/recap-email.
- **Phases** : 1) inventaire des variables → 2) table + seed à l'identique → 3) helper `renderTemplate` (échappement HTML, `{{{var}}}` brut, tests) → 4) refactor des 13 routes une par une + **test d'envoi réel Brevo** → 5) UI admin (liste/édition/preview + « Restaurer défaut ») → 6) RLS. Absorbe l'item 10.

---

## 🟡 Autonomie Florence — édition du site vitrine via /admin (gros chantier différé)

**Décision** : étendre `/admin` (Florence pas tech → pas de Git/MDX/CMS tiers). Réutiliser le pattern CRUD Supabase de `/admin/avis` et `/admin/formations`.

**Phases** :
1. **Scope** avec Florence (MVP probable : Hero + Présentation + Services + Process steps de `app/page.tsx`).
2. **Modèle de données** : table `site_content(section text PK, content jsonb, updated_at)` + schémas TS typés par section (`types/site-content.ts`).
3. **Admin UI** : `/admin/site/page.tsx` (liste) → `/admin/site/[section]/page.tsx` (édition, formulaires Chakra).
4. **Lecture publique** : `app/page.tsx` en RSC avec fetch Supabase + `revalidate: 60` + **fallback sur les valeurs actuelles** (zéro régression).
5. **Seed initial** avec les valeurs hardcodées actuelles.

**Sections candidates** (`app/page.tsx`) : Hero, Présentation Florence, Services (3 cartes), Matières enseignées (carousel), Process (`PARTICULIER_STEPS` / `ECOLE_STEPS`). Témoignages + Formations déjà dynamiques. Mentions légales / politique confidentialité → laisser en dur.

**Mot-clé reprise** : « on attaque l'autonomie Florence » / « on fait le CMS admin ».
