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
- **CRM clients** : `app/admin/clients/` — liste `page.tsx`, fiche `[id]/page.tsx`, modales `NewClientModal.tsx`, `[id]/EditClientModal.tsx`, `DeclarerHeuresModal.tsx`, `[id]/SendRecapModal.tsx`. Type client dans `types/index.ts` (`ClientStatus = 'Prospect' | 'Client'`, champs `ecole_*` pour les établissements).
- **Heures réalisées** : table Supabase `heures_realisees` (hors `schema.sql`). Déclaration via `DeclarerHeuresModal`, récap email/PDF par client via `app/api/heures-realisees/recap-email/route.ts` + `SendRecapModal`. Le récap gère déjà le cumul du temps à reporter (« mois précédent »).
- **Contrats PDF** : `lib/pdf-contract-generator.ts` (établissement / contrat de prestation) et `lib/pdf-contract-particulier-generator.ts` (particulier). Génération + preview via `app/api/procedures/contractualisation-{ecole,particulier}/` (les deux appellent le même générateur → 1 seul endroit à modifier).
- **Emails (~13 templates HTML inline)** : routes `app/api/procedures/*`, `app/api/cron/*`, `lib/fin-de-contrat.ts`, `app/api/heures-realisees/recap-email`. Envoi via **Brevo** (`BREVO_SENDER_EMAIL` = `florence.louazel@arythmeethic.fr`). Notif à Florence uniquement sur le formulaire public « Prendre contact » (`app/api/contact/route.ts`).
- **Auth admin** : `lib/hooks/useAuth.ts` (Supabase auth) + pages `app/admin/login/page.tsx`, `app/admin/forgot-password/page.tsx`, `app/admin/reset-password/page.tsx`.
- **Validation déjà en place** : email côté formulaire public Contact (`EMAIL_REGEX` dans `app/api/contact/route.ts` + `ContactModal.tsx`). Formatage d'affichage des tél via `lib/format.ts` (`formatPhone`).
- **Mise en prod faite** : domaine `arythmeethic.fr` (OVH/DNS), Vercel, M365, Brevo, Supabase, DocuSeal — tout opérationnel.

---

## 🔴 Bugs à corriger en priorité

### B1. Connexion mobile + « mot de passe oublié » KO sur mobile
**Signalé par Florence** : la connexion à `/admin` depuis un mobile ne fonctionne apparemment pas — et/ou le « mot de passe oublié » non plus sur mobile.
- **À reproduire d'abord** sur un vrai mobile (ou DevTools émulation mobile) pour identifier le symptôme exact (page qui ne charge pas ? bouton inactif ? redirection cassée ? lien de l'email de reset qui ne s'ouvre pas ?).
- **Pistes à investiguer** :
  - `app/admin/login/page.tsx` — layout/responsive, état du formulaire, gestion du submit.
  - `lib/hooks/useAuth.ts` — session/cookie Supabase, redirection après login.
  - `app/admin/forgot-password/page.tsx` + `app/admin/reset-password/page.tsx` — URL de redirection du mail de reset (doit pointer vers `https://arythmeethic.fr/...`), comportement du lien ouvert dans le navigateur mobile par défaut.
  - Vérifier les `redirectTo` passés à Supabase et la config Site URL / Redirect URLs côté Supabase Auth.

### B2. Type de formation absent du contrat de prestation (établissement)
**Signalé par Florence** (test du parcours client établissement / contrat de prestation) : **le type de formation n'apparaît pas dans le contrat généré**. Modèle de référence : `FORMULAIRE_Pro.pdf` (Article 2 « Objet du contrat »).
- Le champ `ecole_formation_type` (`'initiale_en_alternance'` → « Formation initiale / en alternance » ; `'continue'` → « Formation continue ») est **saisi** (formulaire recueil école `app/formulaire/recueil-informations-ecole/page.tsx` + `EditClientModal.tsx:1201-1208`) et **affiché sur la fiche** (`app/admin/clients/[id]/page.tsx:1449`), mais **jamais imprimé dans le PDF**.
- **Fix** : ajouter une ligne dans l'**Article 2** de `lib/pdf-contract-generator.ts` (~lignes 146-161, à côté du thème / classes / volume horaire), ex. `  Type de formation : {libellé}` avec mapping enum → libellé. Le même générateur sert la génération réelle ET le preview → corriger à un seul endroit suffit.

---

## 🟡 Retours Florence (call 28 mai 2026) — à faire

> Ordre suggéré : rapides (11, 5, 1, 4) → moyens (2, 3, 6, 8, 10) → gros chantier (12).
> _(Item 7 « mention mois précédents dans le récap » = ✅ déjà fait, retiré. Item 9 = question, répondue, retiré.)_

### 1. Bouton « Retour » sur la fiche client
Ajouter un bouton « Retour » à côté de « Modifier » dans le header de la fiche. Il ramène à la **liste correspondant au type/statut du client** (Prospects / Clients / Archivés — voir item 2).
- Le header actuel (`app/admin/clients/[id]/page.tsx`) n'a que « Modifier » et « Supprimer ».
- Stratégie : `router.push('/admin/clients?tab=...')`, onglet dérivé de `client.client_status`. Côté liste `app/admin/clients/page.tsx`, lire un query param `?tab=` au mount.

### 2. Bouton « Archiver » + onglet « Archivés »
Bouton « Archiver » sur la fiche → stocke une **date d'archivage**, le client devient un 3e type. Nouvel onglet « Archivés » dans `/admin/clients` avec colonne date d'archivage.
- `types/index.ts` : `ClientStatus` → ajouter `'Archivé'`.
- Migration (via `mcp__supabase__apply_migration`, name `add_archived_status`) :
  ```sql
  ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_status_check;
  ALTER TABLE clients ADD CONSTRAINT clients_client_status_check
    CHECK (client_status IN ('Prospect', 'Client', 'Archivé'));
  ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_at timestamptz;
  ```
- Bouton « Archiver » → `UPDATE clients SET client_status='Archivé', archived_at=now()`. Prévoir « Désarchiver ». Exclure les archivés du bouton global « Déclarer des heures ». Couplé à l'item 1 (onglet « archives »).

### 3. Adresse des cours différente — checkbox conditionnelle
Dans les formulaires client (création + édition) + fiche : case « Adresse des cours différente de l'adresse du client ». Si cochée, afficher un bloc « Adresse des cours ».
- **État vérifié** : un champ `adresse_cours` (texte simple) existe déjà dans `EditClientModal` et est affiché sur la fiche (`page.tsx:1681`). **Reste à faire** : la **checkbox conditionnelle**, l'ajout dans **`NewClientModal`** (absent), et un affichage conditionnel propre (aujourd'hui affiché en dur). Champs ville/CP des cours probablement à ajouter (vérifier les colonnes réelles via `mcp__supabase__list_tables` avant migration).

### 4. Détrompeur sur les numéros de téléphone (tous les champs)
Validation des numéros de tél sur **tous les champs** des formulaires (admin + contact). Bloquer la soumission si invalide.
- **État vérifié** : `formatPhone` (`lib/format.ts`) ne fait que de l'**affichage**. Aucune validation bloquante dans `NewClientModal` / `EditClientModal` / `ContactModal`.
- Stratégie : regex FR (ex. `/^(?:(?:\+|00)33[\s.-]?(?:\(0\)[\s.-]?)?|0)[1-9](?:[\s.-]?\d{2}){4}$/`), `FormErrorMessage` sous chaque champ, blocage du submit si rempli + invalide. Centraliser dans `lib/format.ts` ou `lib/validators.ts`.

### 5. Détrompeur sur les emails — AUSSI dans l'admin
- **État vérifié** : fait côté formulaire public Contact (`EMAIL_REGEX` + check 400). **À faire dans l'admin** (`NewClientModal`, `EditClientModal`) : aucune validation regex aujourd'hui (`<Input type="email" />` HTML5 seulement). Vérifier aussi recueil-informations / fin-de-contrat / renouvellement.
- Stratégie : centraliser le regex (`lib/validators.ts`), `FormErrorMessage` sous chaque champ email admin.

### 6. Tableau « Heures réalisées » — colonnes tronquées à droite
Réduire la taille des colonnes (tronquées à droite chez Florence).
- **État vérifié** : tableau à **11 colonnes** (`page.tsx:1873-1963`), dont une **nouvelle colonne « Envoi récap »** ajoutée depuis → le tableau est plus large qu'avant. `TableContainer` (scroll horizontal) et formats compacts (`12h`, `25.00 €`) présents, mais le débordement persiste. Seul le responsive des **boutons d'action** a été corrigé (commit `c28316a`).
- Stratégie : réduire paddings (`px={2}`), masquer des colonnes secondaires en mobile (`display={{ base:'none', md:'table-cell' }}`), formats encore plus compacts (`01/2026`). Tester à 1280/1440px.

### 8. Cas d'annulation dans la déclaration d'heures
Dans `DeclarerHeuresModal` : checkbox « Cas d'annulation » qui révèle un champ « Nombre d'heures à facturer en cas d'annulation ». Ces heures apparaissent dans le récap.
- **État vérifié** : aucune notion d'annulation dans le code des heures aujourd'hui.
- Migration (name `add_heures_annulation`) :
  ```sql
  ALTER TABLE heures_realisees ADD COLUMN IF NOT EXISTS heures_annulation numeric DEFAULT 0;
  ```
- Mettre à jour le calcul du total facturé, le tableau de la fiche (colonne « Annulation ») et le récap email/PDF (`recap-email/route.ts`) : ligne « Heures d'annulation facturées : Xh × Y€ ».

### 10. Uniformiser les salutations — prénom seul pour les particuliers
Tous les emails aux particuliers : salutation = **uniquement le prénom**.
- **État vérifié** : `renouvellement` et `recueil-informations` utilisent déjà le **prénom seul** ✅. Mais encore en « Prénom Nom » : `app/api/procedures/fin-de-contrat/route.ts:14` (`${prénom} ${nom}`) et les contractualisations (`toName` = nom complet du signataire). Récap heures (`recap-email`) = `Bonjour,` générique (à personnaliser).
- Stratégie : passer `firstName` seul partout (particuliers). Écoles : garder « Prénom Nom » a priori. ⚠️ Couplé à l'item 12 (si templates dynamiques, devient un attribut de template).

### 11. Site vitrine — bouton « Formations suivies » dans la nav
À **gauche** de « Cours particuliers » dans `components/Nav.tsx`, ajouter un bouton **« Formations suivies »** qui mène à `/formations` (la page existe : `app/formations/page.tsx`).
- ⚠️ Ce bouton doit ouvrir `/formations` (Link), **pas** appeler `onServiceClick` (scroll, ne marche que sur la home). Style identique aux autres boutons.

### 12. 🔨 GROS CHANTIER — Éditeur de templates emails dans l'admin
Onglet admin (sous « Formations ») permettant à Florence d'éditer **tous les templates d'emails** (~13). Tous les emails sortants deviennent dynamiques.
- **Architecture cible** : table `email_templates(key PK, name, subject, html, variables jsonb, updated_at)` ; pages `/admin/email-templates` (liste) + `/admin/email-templates/[key]` (édition subject+html, preview live, liste des variables) ; helper `lib/email-templates.ts` (`getTemplate`, `renderTemplate` substitution `{{var}}`) ; refactor des 13 routes pour appeler `renderTemplate`.
- Migration (name `create_email_templates`) :
  ```sql
  CREATE TABLE IF NOT EXISTS email_templates (
    key text PRIMARY KEY, name text NOT NULL, subject text NOT NULL,
    html text NOT NULL, variables jsonb DEFAULT '[]'::jsonb,
    updated_at timestamptz DEFAULT now()
  );
  ```
- **Les 13 templates** : contact, preparation-rdv1, recueil-informations, contractualisation-particulier, contractualisation-ecole, envoi-cv-casier, souhait-renouvellement, formulaire/renouvellement, cron/renouvellement-envoi, cron/renouvellement-relance, cron/fin-de-contrat-relance, lib/fin-de-contrat, heures-realisees/recap-email.
- **Phases** : 1) inventaire des variables par template → 2) table + seed à l'identique (zéro régression) → 3) helper `renderTemplate` (échappement HTML, `{{{var}}}` pour HTML brut, tests) → 4) refactor des 13 routes une par une + **test d'envoi réel Brevo** à chaque fois → 5) UI admin (liste/édition/preview + « Restaurer défaut » depuis `lib/email-templates-defaults.ts`) → 6) RLS (seule Florence édite).
- **Garde-fous** : tester chaque template après refactor ; variable manquante → `''` silencieux ; garder les HTML défaut en code pour rollback. ⚠️ Absorbe les items 7 et 10.

---

## 🟡 Autonomie Florence — édition du site vitrine via /admin

**Décision** : étendre `/admin` (Florence pas tech → pas de Git/MDX/CMS tiers). Réutiliser le pattern CRUD Supabase de `/admin/avis` et `/admin/formations`.

**Phases** :
1. **Scope** avec Florence (MVP probable : Hero + Présentation + Services + Process steps de `app/page.tsx`).
2. **Modèle de données** : table `site_content(section text PK, content jsonb, updated_at)` + schémas TS typés par section (`types/site-content.ts`).
3. **Admin UI** : `/admin/site/page.tsx` (liste) → `/admin/site/[section]/page.tsx` (édition, formulaires Chakra).
4. **Lecture publique** : `app/page.tsx` en RSC avec fetch Supabase + `revalidate: 60` + **fallback sur les valeurs actuelles** (zéro régression).
5. **Seed initial** avec les valeurs hardcodées actuelles.

**Sections candidates** (`app/page.tsx`) : Hero, Présentation Florence, Services (3 cartes), Matières enseignées (carousel), Process (`PARTICULIER_STEPS` / `ECOLE_STEPS`). Témoignages + Formations déjà dynamiques. Mentions légales / politique confidentialité → laisser en dur.

**Prérequis** : upload image via `/api/storage/upload` (existe déjà), auth admin (`lib/hooks/useAuth.ts`).

**Mot-clé reprise** : « on attaque l'autonomie Florence » / « on fait le CMS admin ».
