# TODO

## Backoffice / Contractualisation
- [x] Téléchargement du contrat signé (PDF) - bouton dans l'admin (fetch live DocuSeal)
- [x] Preview embed du PDF dans la modale de lancement de contractualisation
- [x] Tester avec une autre adresse mail pour vérifier le fonctionnement des emails de signature

## Site vitrine - Contenu & UX
*(toutes les tâches ci-dessous sont terminées - section conservée pour mémoire)*

## Avis Google
- [x] **Avis Google** - collés manuellement via le back-office (`/admin/avis`), stockés dans Supabase (`google_reviews`), affichés en carousel sur la home

## Référencement (SEO)
- [x] Métadonnées enrichies (`app/layout.tsx`), sitemap (`app/sitemap.ts`), robots (`app/robots.ts`), JSON-LD LocalBusiness
- [x] Soumettre à Google Search Console (vérification du domaine + sitemap)
- [x] Search Console connecté
- [x] Guide Search Console pour Florence

## Site vitrine - Évolutions ✅ DONE
- [x] **Carousel défilant pour les matières** (carousel auto-rotatif 9s/slide avec dots cliquables)
- [x] **Section "Découvrez qui je suis"** : vidéo placeholder retirée, surtitre "En vidéo" -> "À propos"
- [x] **Page "A Rythme Ethic se forme pour mieux vous accompagner"** (table + admin CRUD + export PDF + page publique + bouton)

## Authentification admin ✅ DONE
- [x] **Mot de passe oublié** : `/admin/forgot-password` + `/admin/reset-password`

## Emails - UX ✅ DONE
- [x] Footer cliquable vers la home dans tous les emails
- [x] Email avis Google : phrase bouche-à-oreille ajoutée

## DocuSeal
- [x] Désactivation des emails automatiques DocuSeal vérifiée

## Autonomie de Florence — Édition du site vitrine via /admin 🟡 À FAIRE

**Décision prise** : étendre l'interface `/admin` existante avec une section "Site vitrine" (Florence n'est pas tech du tout, donc pas de Git/GitHub/MDX/CMS tiers). Elle se connecte avec son compte admin existant et édite les textes/images via des formulaires Chakra UI classiques (comme la page `/admin/avis` ou `/admin/formations` qu'on a déjà).

### Architecture cible
- Stockage : table Supabase (probablement une seule table `site_content` clé/valeur, ou tables dédiées par section)
- Stockage images : bucket Supabase `client-files` (déjà existant) ou nouveau bucket public `site-content`
- Lecture côté public : `app/page.tsx` (et autres pages vitrine) lit depuis Supabase au build/SSR plutôt qu'avoir du contenu en dur
- Lecture côté admin : nouvelles pages `/admin/site/...` avec formulaires d'édition
- Auth : RLS Supabase + auth admin existante (cf `lib/hooks/useAuth.ts`)

### Sections candidates à rendre éditables (à confirmer avec Florence)
Inventaire actuel de `app/page.tsx` (942 lignes) :
1. **Hero** (ligne ~194) — titre principal + sous-titre + CTA
2. **Présentation Florence** (ligne ~292) — texte "À propos" + photo
3. **Services** (lignes ~390-558) — 3 cartes : Cours particuliers / Accompagnement / Établissements + leurs sous-textes
4. **Matières enseignées** — carousel défilant (constante `MATIERES` à identifier)
5. **Process** — `PARTICULIER_STEPS` et `ECOLE_STEPS` (lignes 22-42)
6. **Témoignages** — `<GoogleReviewsCarousel />` (déjà géré via `/admin/avis` ✅)
7. **Footer / Contact** — coordonnées + horaires

Autres pages potentiellement à éditer :
- `app/formations/page.tsx` (déjà géré via `/admin/formations` ✅)
- `app/mentions-legales/`, `app/politique-confidentialite/` — probablement à laisser en dur (rare modifs)

### Stratégie d'implémentation recommandée
1. **Phase 1 — Scope** : valider avec Florence quelles sections elle veut vraiment modifier (ne pas tout rendre dynamique). Probable MVP : Hero + Présentation + Services + Process steps.
2. **Phase 2 — Modèle de données** : table unique `site_content` avec colonnes `(section text PK, content jsonb, updated_at)`. Chaque section a un schéma JSON typé côté TS (`types/site-content.ts`).
3. **Phase 3 — Admin UI** : `/admin/site/page.tsx` (liste des sections) → `/admin/site/[section]/page.tsx` (édition). Réutiliser le pattern Chakra Form de `/admin/avis` et `/admin/formations`.
4. **Phase 4 — Lecture publique** : modifier `app/page.tsx` pour passer en RSC (Server Component) et fetcher le contenu depuis Supabase. Garder `revalidate: 60` pour ne pas exploser le SSR. Fallback sur les valeurs actuelles si la row est manquante (pas de régression).
5. **Phase 5 — Migration** : seed initial avec les valeurs actuelles hardcodées pour que Florence ait quelque chose à éditer.

### Prérequis techniques
- Stack existante : Next.js App Router, Chakra UI, Supabase, auth admin Supabase
- Patterns à réutiliser : voir [app/admin/avis/page.tsx](app/admin/avis/page.tsx) et [app/admin/formations/page.tsx](app/admin/formations/page.tsx) pour le pattern CRUD + auth admin
- Migration SQL : ajouter dans [database/schema.sql](database/schema.sql), créer un fichier de migration dans `database/migrations/` si on garde cette convention
- Upload image : route `/api/storage/upload` existe déjà (cf usage dans recueil-informations)

### Mot-clé prochaine session
> "On attaque l'autonomie Florence" ou "On fait le CMS admin"
> → reprendre depuis la **Phase 1 (validation du scope avec Florence)** ou directement implémenter le MVP si Florence valide le scope par défaut (Hero + Présentation + Services + Process).

## Contrats - mise à jour ✅ DONE
- [x] **Nouvelle version du contrat professionnel (école)** intégrée (Article 11 "Référence client" ajouté, articles renumérotés)
- [x] **PDF contrat particulier** : saut de page entre sections 4 et 5

## Contrats - nommage ✅ DONE
- [x] **Renommé partout** : `Contrat - <école|élève> - <année scolaire>` (filename PDF, écran signature DocuSeal, liste admin, téléchargement signé)

## Procédure "Fin de contrat" (Particulier) ✅ DONE
- [x] **Créer la procédure de fin de contrat** - 2 modes de lancement :
  - **A. Manuel** : bouton "Fin de contrat" dans la fiche client → modale (comme les autres procédures) pour choisir le destinataire de l'email
  - **B. Automatique** : déclenchée si la procédure "Souhait de renouvellement" reçoit une réponse "Non" (pas de souhait de renouveler)
  - Étape 1 : email "Fin de contrat" envoyé au destinataire, contenu :
    - "Bonjour [prénom], l'accompagnement de votre enfant touche à sa fin."
    - Lien CESU pour démarches de fin de contrat : https://www.cesu.urssaf.fr/info/accueil/question-du-moment/comment-gerer-la-fin-de-contrat.html
    - Demande de joindre les 3 documents via un formulaire d'upload (lien tokenisé) :
      - Reçu pour solde de tout compte
      - Attestation employeur (= Attestation simplifiée des particuliers employeurs)
      - Certificat de travail
    - Mention que Florence retournera les documents signés
    - Phrase de remerciement + mention que Florence fait des sessions de révisions Brevet/BAC ponctuelles
  - Étape 2 : formulaire d'upload côté client (route `/formulaire/fin-de-contrat/[token]`) — 3 emplacements pour les 3 documents
  - Étape 3 : **relance auto tous les 3 jours à 18h** tant que les 3 documents ne sont pas uploadés (cron, comme renouvellement-relance)
  - **PAS d'envoi de questionnaire de satisfaction** ici
  - **PAS d'envoi du mail avis Google** ici (déjà fait dans la procédure renouvellement avant cette étape, on évite le doublon)
  - L'envoi du récap des heures n'est PAS automatique dans cette procédure (le récap est déjà déclenchable manuellement depuis l'admin via `app/api/heures-realisees/recap-email`)

## Mise en ligne sur arythmeethic.fr
> Contexte : site Next.js déployé sur Vercel (auto-deploy depuis main). Florence a un compte Microsoft 365
> Florence a le compte `florence.louazel@arythmeethic.fr` dans Supabase auth.users.
> Les emails transactionnels sont envoyés via Brevo - la variable BREVO_SENDER_EMAIL est utilisée dans 10 routes API.
> Les contrats sont générés et envoyés pour signature via DocuSeal (app.docuseal.com, clé API dans DOCUSEAL_API_KEY).
> L'hébergement reste sur Vercel - le registrar sert uniquement à gérer le DNS.

### Étape 1 - Acheter le domaine
- [x] Acheter `arythmeethic.fr` sur OVH ✅

### Étape 2 - DNS (registrar OVH)
- [x] Enregistrement `A` : `@` → `76.76.21.21` ✅
- [x] Enregistrement `CNAME` : `www` → `cname.vercel-dns.com` ✅
- [x] Enregistrements Microsoft 365 (MX, SPF, CNAME Autodiscover) ✅
- [x] Enregistrements Brevo (DKIM x2, SPF, DMARC) ✅

### Étape 3 - Vercel ✅
- [x] `arythmeethic.fr` et `www.arythmeethic.fr` ajoutés ✅
- [x] `BREVO_SENDER_EMAIL` → `florence.louazel@arythmeethic.fr` ✅

### Étape 4 - Microsoft 365 ✅
- [x] Adresse `florence.louazel@arythmeethic.fr` créée + DNS validé ✅

### Étape 5 - Brevo ✅
- [x] Adresse expéditeur mise à jour → `florence.louazel@arythmeethic.fr` ✅

### Étape 6 - DocuSeal ✅
- [x] Pas d'email à configurer ✅

### Étape 6b - OVHcloud ✅
- [x] DNS vérifié et à jour ✅

### Étape 7 - Supabase ✅
- [x] Nouvel user `florence.louazel@arythmeethic.fr` créé avec rôle admin ✅
- [x] Ancien user supprimé ✅
- [x] Site URL → `https://arythmeethic.fr` mis à jour dans Authentication → URL Configuration ✅
