# TODO

## Backoffice / Contractualisation
- [x] Téléchargement du contrat signé (PDF) — bouton dans l'admin (fetch live DocuSeal)
- [x] Preview embed du PDF dans la modale de lancement de contractualisation
- [ ] Tester avec une autre adresse mail pour vérifier le fonctionnement des emails de signature

## Site vitrine — Contenu & UX
*(toutes les tâches ci-dessous sont terminées — section conservée pour mémoire)*

## Avis Google
- [x] **Avis Google** — collés manuellement via le back-office (`/admin/avis`), stockés dans Supabase (`google_reviews`), affichés en carousel sur la home

## Référencement (SEO)
- [x] Métadonnées enrichies (`app/layout.tsx`), sitemap (`app/sitemap.ts`), robots (`app/robots.ts`), JSON-LD LocalBusiness
- [ ] Soumettre à Google Search Console (vérification du domaine + sitemap) — action manuelle Florence/Thomas

## Autonomie de Florence
- [ ] **Permettre à Florence de modifier le site vitrine seule** — pistes à explorer :
  - **Option simple :** créer une formation/doc Markdown lui expliquant comment éditer `app/page.tsx` via GitHub web UI (déploiement auto Vercel) — convient pour modifs textuelles
  - **Option médiane :** extraire les textes du site dans des fichiers JSON ou MDX éditables, garder le code séparé
  - **Option robuste :** intégrer un CMS headless (Sanity, Contentful, Payload, ou Supabase + interface admin custom) — Florence édite via une interface graphique, pas de code
  - **À décider** selon le niveau d'autonomie souhaité et le budget

## Mise en ligne sur arythmeethic.fr
> Contexte : site Next.js déployé sur Vercel (auto-deploy depuis main). Florence a un compte Microsoft 365
> Florence a le compte `florence.louazel@arythmeethic.fr` dans Supabase auth.users.
> Les emails transactionnels sont envoyés via Brevo — la variable BREVO_SENDER_EMAIL est utilisée dans 10 routes API.
> Les contrats sont générés et envoyés pour signature via DocuSeal (app.docuseal.com, clé API dans DOCUSEAL_API_KEY).
> L'hébergement reste sur Vercel — le registrar sert uniquement à gérer le DNS.

### Étape 1 — Acheter le domaine
- [x] Acheter `arythmeethic.fr` sur OVH ✅

### Étape 2 — DNS (registrar OVH)
- [x] Enregistrement `A` : `@` → `76.76.21.21` ✅
- [x] Enregistrement `CNAME` : `www` → `cname.vercel-dns.com` ✅
- [x] Enregistrements Microsoft 365 (MX, SPF, CNAME Autodiscover) ✅
- [x] Enregistrements Brevo (DKIM x2, SPF, DMARC) ✅

### Étape 3 — Vercel ✅
- [x] `arythmeethic.fr` et `www.arythmeethic.fr` ajoutés ✅
- [x] `BREVO_SENDER_EMAIL` → `florence.louazel@arythmeethic.fr` ✅

### Étape 4 — Microsoft 365 ✅
- [x] Adresse `florence.louazel@arythmeethic.fr` créée + DNS validé ✅

### Étape 5 — Brevo ✅
- [x] Adresse expéditeur mise à jour → `florence.louazel@arythmeethic.fr` ✅

### Étape 6 — DocuSeal ✅
- [x] Pas d'email à configurer ✅

### Étape 6b — OVHcloud ✅
- [x] DNS vérifié et à jour ✅

### Étape 7 — Supabase ✅
- [x] Nouvel user `florence.louazel@arythmeethic.fr` créé avec rôle admin ✅
- [x] Ancien user supprimé ✅
- [x] Site URL → `https://arythmeethic.fr` mis à jour dans Authentication → URL Configuration ✅
