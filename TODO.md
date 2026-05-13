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

## Autonomie de Florence
- [ ] **Rendre Florence autonome sur les modifs du site vitrine** - pistes :
  - **Option simple :** doc Markdown expliquant comment éditer `app/page.tsx` via GitHub web UI (déploiement auto Vercel)
  - **Option médiane :** extraire les textes du site dans des fichiers JSON ou MDX éditables, garder le code séparé
  - **Option robuste :** intégrer un CMS headless (Sanity, Contentful, Payload, ou Supabase + interface admin custom)
  - **À décider** selon le niveau d'autonomie souhaité et le budget

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
