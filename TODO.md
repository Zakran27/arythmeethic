# TODO

## Backoffice / Contractualisation
- [ ] Téléchargement du contrat signé (PDF) — bouton dans l'admin pour les procédures terminées
- [ ] Ajouter une preview embed du PDF dans la modale de lancement de contractualisation
- [ ] Tester avec une autre adresse mail pour vérifier le fonctionnement des emails de signature

## Site vitrine — Contenu & UX
*(toutes les tâches ci-dessous sont terminées — section conservée pour mémoire)*

## Avis Google
- [ ] **Carousel d'avis Google** — afficher les vrais avis Google avec un carousel défilement auto. Pistes :
  - Google Places API (Place Details endpoint, retourne jusqu'à 5 avis) — clé API + restriction par domaine, payant au-delà du quota gratuit
  - Service tiers type Elfsight, Trustmary, ReviewsOnMyWebsite (widget intégrable, abonnement mensuel)
  - Scrape manuel + stockage Supabase + rafraîchissement périodique (gratuit mais fragile)
  - **Recommandé :** Google Places API via une route Next.js qui cache les résultats côté serveur (revalidate 24h) pour éviter les coûts

## Référencement (SEO)
- [ ] Améliorer le référencement :
  - Métadonnées (title, description, og:image) via API `metadata` Next.js sur chaque page
  - Sitemap automatique via `app/sitemap.ts`
  - `robots.txt` via `app/robots.ts`
  - Soumettre à Google Search Console (vérification du domaine + sitemap)
  - Données structurées JSON-LD (LocalBusiness, Person)

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
