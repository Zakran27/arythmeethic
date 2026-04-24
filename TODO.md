# TODO

- [ ] Téléchargement du contrat signé (PDF) — bouton dans l'admin pour les procédures terminées
- [ ] Nouveaux contrats à remplacer pour la procédure contractualisation
- [ ] Ajouter une preview embed du PDF dans la modale de lancement de contractualisation
- [ ] Tester avec une autre adresse mail pour vérifier le fonctionnement des emails de signature
- [ ] Rechecher l'entièreté des PDFs de signature — les accents ont disparu ?

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

### Étape 4 — Microsoft 365
- [ ] **Demander à Florence** de créer l'adresse `florence.louazel@arythmeethic.fr` dans Centre d'admin Microsoft 365 → Utilisateurs

### Étape 5 — Brevo
- [ ] **Demander à Florence** de mettre à jour l'adresse expéditeur dans Brevo → `florence.louazel@arythmeethic.fr`

### Étape 6 — DocuSeal
- [ ] **Demander à Florence** de mettre à jour l'adresse expéditeur dans app.docuseal.com → Settings → Email / Notifications

### Étape 6b — OVHcloud (si nécessaire)
- [ ] Vérifier / mettre à jour les enregistrements DNS dans OVHcloud si besoin

### Étape 7 — Supabase ✅
- [x] Nouvel user `florence.louazel@arythmeethic.fr` créé avec rôle admin ✅
- [x] Ancien user supprimé ✅
- [x] Site URL → `https://arythmeethic.fr` mis à jour dans Authentication → URL Configuration ✅
