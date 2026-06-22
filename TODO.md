# TODO

> ⚠️ **DB : utiliser le MCP Supabase, PAS `database/schema.sql`** (`mcp__supabase__list_tables` / `apply_migration` / `get_advisors`).

Tout le reste est terminé. Seul chantier restant ci-dessous.

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
