# TODO

> ⚠️ **DB : utiliser le MCP Supabase, PAS `database/schema.sql`** (`mcp__supabase__list_tables` / `apply_migration` / `get_advisors`).

Lots 1 à 8 du meeting Flo d'oct. 2026 livrés. Restent les chantiers ci-dessous.

---

## 🔴 Lot 9 — Signatures DocuSeal des documents de fin de contrat

**Bloqué** : attendre les 3 PDF modèles de Florence (solde de tout compte, attestation employeur, certificat de travail) pour placer les champs de signature.

**Déjà en place** : colonnes `documents.docuseal_submission_id` + `documents.signed_at` (migration-meeting-oct26.sql, Lot 9). Aucun code.

**À faire** (réutiliser `lib/docuseal.ts`, `lib/signatures.ts`, `app/api/cron/signatures`) :
1. **Solde de tout compte** : signature Florence PUIS parent (champ Florence sous « signature du salarié »).
2. **Attestation employeur** + **Certificat de travail** : signature du parent seul.
3. Une fois signé : le PDF signé remplace le document existant de la procédure, et est envoyé par email au parent.
4. Templates d'email éditables (demande initiale + relance), relance **hebdomadaire** tant que ce n'est pas signé.
5. Formulaire fin de contrat : mention « pas besoin de signer ces documents, vous recevrez un lien de signature ».
6. Formulaire fin de contrat : documents **obligatoires** et **PDF uniquement** (accepte encore jpg/png/doc aujourd'hui — `app/formulaire/fin-de-contrat/[token]`, `app/api/formulaire/fin-de-contrat/route.ts`).

**Mot-clé reprise** : « on attaque le Lot 9 ».

---

## 🟡 Autonomie Florence — édition du site vitrine via /admin (le « CMS »)

**Objectif** : permettre à Florence (non-tech) d'éditer elle-même les textes/images du site vitrine, sans intervention dev.

**Décision** : étendre `/admin` (pas de Git/MDX/CMS tiers). Réutiliser le pattern CRUD Supabase déjà en place pour `/admin/avis`, `/admin/formations`, `/admin/bandeaux` et `/admin/email-templates`.

**Phases** :
1. **Scope** avec Florence (MVP probable : Hero + Présentation + Services + Process steps de `app/page.tsx`).
2. **Modèle de données** : table `site_content(section text PK, content jsonb, updated_at)` (RLS : lecture publique, écriture authentifiée — comme `site_messages`) + schémas TS typés par section (`types/site-content.ts`).
3. **Admin UI** : `/admin/site/page.tsx` (liste des sections) → `/admin/site/[section]/page.tsx` (édition via formulaires Chakra). Ajouter le lien dans `components/AdminShell.tsx`.
4. **Lecture publique** : faire lire à `app/page.tsx` le contenu depuis Supabase (RSC + `revalidate: 60`) **avec fallback sur les valeurs actuelles** si la ligne manque (zéro régression).
5. **Seed initial** avec les valeurs hardcodées actuelles, pour que Florence ait une base à éditer.

**Sections candidates** (`app/page.tsx`) : Hero, Présentation Florence, Services (3 cartes), Matières enseignées (carousel), Process (`PARTICULIER_STEPS` / `ECOLE_STEPS`). Témoignages (avis) + Formations sont déjà dynamiques → ne pas refaire.

**Repère pour l'éditeur de texte** : un éditeur rich-text TipTap réutilisable existe déjà (`components/RichTextEditor.tsx`) — utile si on veut laisser Florence mettre en forme certains textes.

**Mot-clé reprise** : « on attaque l'autonomie Florence » / « on fait le CMS admin ».
