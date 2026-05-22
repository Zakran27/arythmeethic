# TODO

## 🟠 Retours Florence (22 mai 2026) — À FAIRE prochaine session

### 1. Mail de notification à Florence quand un formulaire est rempli sur le site
**Demande Florence :** "Pourrais-tu ajouter un mail de notification pour moi lorsque les personnes remplissent un formulaire sur le site ?"

**État actuel du code :**
- Formulaire de contact public : [components/ContactModal.tsx](components/ContactModal.tsx) → POST [app/api/contact/route.ts](app/api/contact/route.ts) → insère un Prospect en DB + envoie un mail d'accusé de réception au prospect, mais **pas de notification à Florence**.
- Autres formulaires côté client (à recenser) : `app/formulaire/recueil-informations/[token]`, `app/formulaire/fin-de-contrat/[token]`, éventuellement formulaires de signature DocuSeal (gérés par DocuSeal directement).

**Stratégie pressentie :**
- Dans [app/api/contact/route.ts](app/api/contact/route.ts) : après l'insert prospect réussi, envoyer un second mail via Brevo à `florence.louazel@arythmeethic.fr` (ou la variable `BREVO_SENDER_EMAIL` / une variable `FLORENCE_NOTIF_EMAIL`) avec le contenu du formulaire (nom, email, téléphone, message, type de demande).
- Réutiliser le helper d'envoi Brevo existant (cf autres routes API qui envoient déjà des mails — `app/api/heures-realisees/recap-email/route.ts` par ex).
- Vérifier si on étend la notif aux autres formulaires (recueil-informations, fin-de-contrat) ou si Florence ne parle que du formulaire de contact public.
- ⚠️ **À clarifier avec Florence** : uniquement le formulaire de contact, ou tous les formulaires du site (recueil-informations, fin-de-contrat, etc.) ?

---

## 🟠 Retours Florence (21 mai 2026) — À FAIRE prochaine session

> Messages reçus de Florence après la dernière livraison. À traiter en bloc à la prochaine session.

### 1. Temps à reporter — cumul et bascule auto à 1h
**Demande Florence :**
- Le temps à reporter doit se **cumuler avec le report du mois précédent**.
- Lorsque le cumul **dépasse 1h**, il doit **automatiquement être ajouté à la déclaration** du parent.
- Le compteur garde en mémoire le **reste** s'il y en a (ex. cumul 1h30 → 1h facturée, 0h30 reporté au mois suivant).

**État actuel du code (à modifier) :**
- Table `heures_realisees` : colonne `temps_a_reporter` (numeric) déjà présente, saisie manuellement dans [HeuresRealiséesModal.tsx](app/admin/clients/[id]/HeuresRealiséesModal.tsx).
- Affichage dans la fiche client : colonne "À reporter" du tableau heures réalisées ([app/admin/clients/\[id\]/page.tsx](app/admin/clients/[id]/page.tsx) ~ligne 1859).
- Le récap envoyé par email ([app/api/heures-realisees/recap-email/route.ts](app/api/heures-realisees/recap-email/route.ts)) **n'utilise pas du tout** `temps_a_reporter` aujourd'hui.

**Stratégie pressentie :**
- À l'affichage du mois N et à la génération du recap mois N : calculer `cumul = temps_a_reporter(mois N) + report_restant(mois N-1)`.
- Si `cumul >= 1` : ajouter `floor(cumul)` heures (en heures entières ? ou demi-heures ?) à la facturation, et sauvegarder `cumul - floor(cumul)` comme nouveau report.
- Ajouter une colonne `report_restant` (ou réutiliser `temps_a_reporter` après "consommation") dans `heures_realisees`, ou calculer dynamiquement à partir de l'historique.
- ⚠️ **À clarifier avec Florence** :
  - Le seuil "1h" déclenche-t-il un report à l'unité (1h, 2h, etc.) ou par paliers de 0.5h ?
  - Faut-il ajouter ces heures à la facturation **automatiquement** au moment de la saisie, ou seulement au moment de l'envoi du récap mensuel ?
  - Le récap envoyé doit-il afficher explicitement "+ X h reportées du mois précédent" pour transparence ?

### 2. Bouton "Envoyer la déclaration mensuelle" dans la fiche client particulier
**Demande Florence :** ajouter un bouton dans la fiche client (Particulier) pour envoyer la déclaration mensuelle directement, sans passer par le bouton global de la liste clients.

**État actuel du code :**
- Modale globale [DeclarerHeuresModal.tsx](app/admin/clients/DeclarerHeuresModal.tsx) qui scanne toutes les heures sur une plage de dates et permet d'envoyer en bulk via `/api/heures-realisees/recap-email`.
- Pas de bouton "Envoyer le récap" individuel sur la fiche client.

**Stratégie pressentie :**
- Ajouter, à côté du bouton "+ Déclarer des heures" dans la section "Heures réalisées" de [app/admin/clients/\[id\]/page.tsx](app/admin/clients/[id]/page.tsx) (~ligne 1799), un bouton "Envoyer la déclaration mensuelle".
- Au clic : ouvrir une modale (ou inline) listant les mois éligibles (non encore envoyés) avec un select destinataire (parent1/parent2/jeune) et un bouton "Envoyer" qui appelle `/api/heures-realisees/recap-email` avec une seule entrée.

### 3. Indicateur "Déclaration mensuelle envoyée" dans la fiche client
**Demande Florence :** "J'aimerais voir dans la fiche client que la déclaration mensuelle a été envoyée afin de ne pas perdre la tête."

**État actuel du code :** rien n'est tracké côté DB. Le récap est envoyé via Brevo sans persister de marqueur.

**Stratégie pressentie :**
- Ajouter dans `heures_realisees` une colonne `recap_email_sent_at timestamptz` (nullable) + éventuellement `recap_email_to text`.
- À chaque envoi réussi via `/api/heures-realisees/recap-email`, faire un `UPDATE heures_realisees SET recap_email_sent_at = now(), recap_email_to = parentEmail WHERE client_id = ? AND mois = ?`.
- Dans la fiche client (tableau heures réalisées) : ajouter une colonne (ou un badge) "Envoyé le JJ/MM/AAAA à <email>". Si non envoyé : badge orange "Non envoyé".
- Migration SQL à créer dans `database/` (la table n'est pas dans `schema.sql` aujourd'hui — créée directement dans Supabase).

### 4. Validation email côté formulaire de contact
**Demande Florence :** elle a tapé un email faux et n'a eu **aucune notification** pour l'inviter à vérifier. Comportement actuel anormal.

**État actuel du code :**
- [components/ContactModal.tsx](components/ContactModal.tsx) : champ `<Input type="email" />` (HTML5 only, validation très permissive).
- [app/api/contact/route.ts](app/api/contact/route.ts) : aucune validation regex/RFC sur l'email avant insertion en DB et envoi du mail.
- Conséquence : si l'utilisateur tape `florence@arythmeethic` (sans `.fr`) ou `florence@.com`, le formulaire passe silencieusement et la réponse de Florence partira dans le vide.

**Stratégie pressentie :**
- Côté client : ajouter validation regex (ou lib `zod`/`yup`) qui bloque la soumission tant que l'email n'a pas la forme `<local>@<domain>.<tld>` (TLD 2+ chars). Afficher un `FormErrorMessage` rouge sous le champ.
- Côté API : refuser le POST si l'email ne match pas le regex (renvoyer 400 avec message clair pour pas insérer un Prospect avec un email mort en base).
- Bonus à discuter : double opt-in mail de confirmation envoyé au prospect pour valider qu'il reçoit bien les emails (probablement overkill, on s'en tient à la validation format pour cette itération).

### Mot-clé prochaine session
> "On attaque les retours Florence" → reprendre dans l'ordre 1 → 2 → 3 → 4 (le 1 a le plus d'inconnues fonctionnelles à clarifier avec Florence avant d'implémenter).

---

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
