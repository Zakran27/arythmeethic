# TODO

> ⚠️ **DB : utiliser le MCP Supabase, PAS `database/schema.sql`** (`mcp__supabase__list_tables` / `apply_migration` / `get_advisors`). Sans MCP : migration à coller dans le SQL Editor **avant** de pousser le code qui l'utilise.
>
> 📌 Mode plan : rien ne démarre sans « go ». Commits directement sur `main` (pas de branche ni de PR).

Lots 1 à 9 du meeting d'oct. 2026 livrés (13/10), + facturation du 1er RDV au mois choisi et boutons Stopper / Reprendre les relances / Annuler la signature.

---

## 🧭 Meeting Flo du 29/10/2026

Taille : XS = quelques lignes · S = < ½ j · M = ~1 j · L = plusieurs jours.

### A. Corrections rapides

**A1. Sitemap en échec sur `www.arythmeethic.fr` (Google Search Console)** — XS, à investiguer
- `arythmeethic.fr` fonctionne, `www.` est en échec. `app/sitemap.ts`, `robots.ts` et `layout.tsx` déclarent tous `https://arythmeethic.fr` (sans www).
- À vérifier : redirection `www → apex` dans Vercel (Domains) et propriété Search Console. Si `www` redirige, c'est normal que son sitemap « échoue » : soumettre le sitemap sur la propriété `arythmeethic.fr` (ou une propriété Domaine).

**A2. Objet de l'email DocuSeal de fin de contrat** — XS
- Florence reçoit « Signature du contrat » (objet par défaut DocuSeal) pour le reçu pour solde de tout compte.
- Passer un `name` + `message.subject` à la soumission DocuSeal (`lib/docuseal.ts` → `createSubmission`), ex. « Fin de contrat – Reçu pour solde de tout compte ». Vérifier aussi l'objet des emails Brevo (templates `fin-de-contrat-*`).

**A3. Renommer le bouton « Déclarer heures » de la liste Contacts en « Envoyer les heures »** — XS (`app/admin/clients/page.tsx`).

**A4. Le parent administratif choisi dans le recueil ne remonte pas dans la fiche ?** — S, bug à reproduire
- Prévu : le parent choisi comme gestionnaire administratif bascule en Parent 1 (`app/api/formulaire/recueil-informations/route.ts`).
- Vérifier sur un recueil réel / test : la bascule se fait-elle ? La fiche l'affiche-t-elle clairement (libellé « Parent administratif ») ?

### B. Liste Contacts & envoi des contrats

**B1. Téléphone de la personne principale dans la liste Contacts** — S
- Particulier : téléphone du **parent administratif** (Parent 1).
- Pro : téléphone du **responsable du module**.

**B2. Contrat pro : destinataire visible + relecteur avant signature** — L
- Afficher sur la ligne d'envoi (historique) l'**email du destinataire** du contrat de prestation, et celui du **relecteur** s'il y en a un.
- À l'envoi du contrat pro : choix optionnel d'un **relecteur** parmi les contacts de la fiche. Le contrat part d'abord chez lui (lien de relecture : aperçu PDF + bouton « Valider »), avec **relances** tant qu'il n'a pas validé ; une fois validé, le contrat part en signature DocuSeal.
- Option : laisser le relecteur choisir/corriger le signataire au moment de valider. Faisable côté app (formulaire de validation avec le nom/email du signataire, puis création de la soumission DocuSeal à ce moment-là) — DocuSeal n'est pas en cause puisqu'on ne crée la signature qu'après la relecture. À arbitrer : plus de travail, mais résout le cas « l'école ne m'avait pas dit qui signait ».
- Nouveaux templates email : demande de relecture + relance relecture.

### C. Heures / Suivi CESU

**C1. Suivi CESU : actions en masse** — M
- Cases à cocher par ligne + « tout sélectionner ».
- Bouton **« Déclarer les heures »** : ouvre la saisie des heures (même modale que sur la fiche contact, `HeuresRealiséesModal`) **un contact après l'autre** pour tous les sélectionnés.
- Bouton **« Envoyer les heures »** : même envoi groupé que celui de la liste Contacts (`DeclarerHeuresModal`), pré-filtré sur la sélection.

**C2. 1er RDV : seules les heures entières sont facturées, le reste va au compteur** — S
- Ex. 1,97 h → 1 h facturée sur le mois choisi, 0,97 h ajoutée au compteur de report du mois (incrémente le compteur).
- Modifie la règle du 13/10 (durée facturée telle quelle) : `lib/heures-report.ts` (+ test `heures-report.check.mjs`), récap PDF/email, aperçus. Hélène WATTEZ / Vanessa Bulan (1,47 h / 1,73 h en oct.) : recalcul à prévoir si le récap d'octobre n'est pas encore parti.

### D. Fin de contrat (particulier)

**D1. Rappel du flow actuel** (question de Flo — pas de dev)
- Dès que le parent a déposé les 3 PDF : il reçoit tout de suite les liens pour **l'attestation employeur** et **le certificat de travail** (signés par lui seul).
- **Reçu pour solde de tout compte** : Florence signe d'abord (email DocuSeal), puis le parent reçoit son lien **au passage du cron du matin suivant (7 h)** → jusqu'à ~24 h de délai.
- Chaque document signé remplace l'original dans la fiche et part au parent en PJ ; relance hebdo tant que tout n'est pas signé.

**D2. Savoir qui a signé / qui n'a pas signé, depuis l'admin** — S
- Aujourd'hui : badge « Signé / Signature en cours » par document, sans détail.
- Ajouter, comme pour la contractualisation : « En attente de : Florence / le parent » sur chaque document (et au clic sur le document non signé).
- Option : envoyer le lien du solde au parent **immédiatement** après la signature de Florence (webhook DocuSeal) au lieu du cron du matin.

### E. Recueil d'informations

**E1. Adresse normalisée : rue + code postal + ville** — M
- Champs séparés (ou autocomplétion qui remplit les 3).
- Autocomplétion : **API Adresse de l'État (Géoplateforme / adresse.data.gouv.fr), gratuite, sans clé** — recommandée. Google Places est payant au-delà d'un quota, avec clé et facturation à configurer.
- Impact : formulaire public, fiche, modale d'édition, et reprise des adresses existantes (champ texte libre aujourd'hui).

### F. Site vitrine

**F1. Liste d'attente : interrupteur dédié** — S
- Aujourd'hui l'inscription en liste d'attente dépend du bandeau « complet » (`app/api/contact/route.ts`, `banner?.enabled`).
- Ajouter un **switch Activer / Désactiver la liste d'attente** dans l'onglet *Liste d'attente* (réglage en base), et ne plus dépendre du bandeau/popup (réutilisable pour autre chose).
- Quand la liste d'attente est active : en fin de formulaire de contact, **rediriger vers la page Ressources Partenaires** (F2).

**F2. Page « Ressources Partenaires / Recommandations »** — L
- Page publique (lien dans le menu du haut), liste de partenaires sur le modèle des Formations.
- Onglet admin **Partenaires** (menu de gauche) : ajouter / modifier / masquer / ordonner.
- **Formulaire d'inscription partenaire** : Florence envoie un lien à quelqu'un ; ses infos arrivent dans l'onglet Partenaires comme **demande à valider** (rien n'est publié sans validation).

**F3. Page « Ressources Lycée / Collège »** — L
- Page publique (lien dans le menu du haut), organisée en **colonnes thématiques** comme le Padlet de Florence (Troubles de l'apprentissage, Gestion du stress et des émotions, À la rencontre de soi, Sommeil, Santé, Numéros utiles…).
- **Cartes compactes** (titre, petite vignette ou icône, lien, courte description) : plus légères que Padlet, page non surchargée.
- Onglet admin **Ressources** façon Trello : colonnes et cartes, ajout / édition / déplacement / ordre.
- Reprise du contenu du Padlet existant (à importer à la main ou en lot).

**F4. CMS : Florence modifie les textes et photos du site** — L
**Objectif** : permettre à Florence (non-tech) d'éditer elle-même les textes/images du site vitrine, sans intervention dev.
**Décision** : étendre `/admin` (pas de Git/MDX/CMS tiers). Réutiliser le pattern CRUD Supabase déjà en place pour `/admin/avis`, `/admin/formations`, `/admin/bandeaux` et `/admin/email-templates`.
1. **Scope** avec Florence (MVP probable : Hero + Présentation + Services + Process steps de `app/page.tsx`).
2. **Modèle de données** : table `site_content(section text PK, content jsonb, updated_at)` (RLS : lecture publique, écriture admin — comme `site_messages`) + schémas TS typés par section (`types/site-content.ts`).
3. **Admin UI** : `/admin/site` (liste des sections) → `/admin/site/[section]` (édition via formulaires Chakra). Lien dans `components/AdminShell.tsx`.
4. **Lecture publique** : `app/page.tsx` lit le contenu depuis Supabase (RSC + `revalidate: 60`) **avec fallback sur les valeurs actuelles** si la ligne manque (zéro régression).
5. **Seed initial** avec les valeurs actuelles. Photos : upload dans Supabase Storage, **redimensionnées/compressées** (cf. audit perf : images de l'accueil trop lourdes).
- Sections candidates : Hero, Présentation, Services (3 cartes), Matières (carousel), Process (`PARTICULIER_STEPS` / `ECOLE_STEPS`). Avis + Formations déjà dynamiques. Éditeur rich-text TipTap réutilisable : `components/RichTextEditor.tsx`.

---

## 🔒 Audit sécurité / performance (19/10) — en attente de go

Sans code (Thomas) : définir `CRON_SECRET` dans Vercel ; vérifier dans Supabase inscriptions fermées, policies du bucket `client-files` et de `profiles`.

Code, par priorité :
1. Fermer `/api/storage/upload` (public, écrit en service role) → URL signée liée au token pour le recueil école.
2. Vérifier le rôle admin (`requireAdmin()`) dans le middleware, pas seulement la session.
3. `cron/renouvellement-envoi` : fenêtre de juin + anti-doublon + `maxDuration`.
4. Mettre à jour Next.js (15.0.5 → 15.5.x+).
5. Échapper les variables des emails ; anti-spam sur `/api/contact`.
6. Images de l'accueil (14 Mo au 1er affichage) → `next/image` + compression.
7. Uploads fin de contrat > 4,5 Mo (limite Vercel) → URL signée.
8. `heures_realisees` / `contact_logs` lus en entier (plafond 1 000 lignes) → filtrer côté serveur.
9. Fiche client : spinner seulement au 1er chargement, requêtes en parallèle.

---

**Mot-clé reprise** : « on attaque le point X » (ex. « on attaque C1 »).
