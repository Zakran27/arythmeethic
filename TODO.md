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
- [ ] Soumettre à Google Search Console (vérification du domaine + sitemap) - action manuelle Florence/Thomas
- [ ] **Chercher comment faire des trucs dans Search Console** (rapports d'indexation, requêtes performantes, etc. - rédiger un guide pour Florence)

## Emails - UX
- [ ] **Rendre le footer de tous les emails cliquable** vers la page d'accueil `https://arythmeethic.fr` (zone "Florence Louazel / A Rythme Ethic" en bas de chaque email)
- [ ] **Email avis Google** : ajouter une phrase invitant au bouche-à-oreille - *« Le bouche-à-oreille peut être également plus efficace, n'hésitez pas à en parler autour de vous ! »* (template dans `app/api/formulaire/renouvellement` qui demande l'avis Google)

## DocuSeal
- [ ] **Chercher comment désactiver les emails automatiques de DocuSeal** (on veut que ce soit uniquement Brevo qui envoie les emails de signature, pas DocuSeal en doublon)

## Autonomie de Florence
- [ ] **Rendre Florence autonome sur les modifs du site vitrine** - pistes :
  - **Option simple :** doc Markdown expliquant comment éditer `app/page.tsx` via GitHub web UI (déploiement auto Vercel)
  - **Option médiane :** extraire les textes du site dans des fichiers JSON ou MDX éditables, garder le code séparé
  - **Option robuste :** intégrer un CMS headless (Sanity, Contentful, Payload, ou Supabase + interface admin custom)
  - **À décider** selon le niveau d'autonomie souhaité et le budget

## Contrats - nommage
- [ ] **Renommer les contrats partout** (génération PDF, écran de signature DocuSeal, liste "Contrats signés" dans l'admin) :
  - École : `Contrat - {nom école} - {année scolaire}`
  - Particulier : `Contrat - {nom de l'élève} - {année scolaire}`

## Procédure "Fin de contrat" (Particulier)
- [ ] **Créer la procédure de fin de contrat pour les particuliers** :
  - Étape 1 : email d'annonce de fin de contrat avec récap
  - Étape 2 : envoi automatique du relevé annuel des heures réalisées avec le jeune *(si pas déjà envoyé manuellement - vérifier l'envoi de récap des heures déjà en place dans `app/api/heures-realisees/recap-email`)*
  - Étape 3 : email avec procédure expliquant comment mettre fin au contrat côté CESU (lien officiel) + demande de retourner les 3 documents signés :
    - Attestation simplifiée des particuliers employeurs
    - Certificat de travail
    - Reçu pour solde de tout compte
  - Étape 4 : **formulaire d'upload** côté client (lien tokenisé envoyé par email) pour qu'il dépose les 3 documents
  - Étape 5 : **relance auto tous les 3 jours à 18h** tant que les documents n'ont pas été uploadés (cron, comme la relance renouvellement)
  - Étape 6 : envoi d'un questionnaire de satisfaction + demande d'avis Google (réutiliser le template d'email de `app/api/formulaire/renouvellement` qui demande déjà un avis Google)

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
