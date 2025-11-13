# A Rythme Ethic (Arythmeethic)

Portail d'administration pour la gestion des clients et des procédures de formation.

## 🚀 Technologies

- **Next.js 15** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Chakra UI** - Composants UI et design system
- **Supabase** - Backend (PostgreSQL + Auth)
- **n8n** - Automatisation des workflows

## 📋 Prérequis

- Node.js 18+
- pnpm (gestionnaire de paquets)
- Compte Supabase
- Compte n8n (optionnel)

## 🔧 Installation

1. **Cloner le projet**

```bash
git clone https://github.com/Zakran27/arythmeethic.git
cd arythmeethic
```

2. **Installer les dépendances**

```bash
pnpm install
```

3. **Configuration des variables d'environnement**

Créez un fichier `.env.local` à la racine du projet :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon

# n8n Webhooks (optionnel)
N8N_WEBHOOK_CREATE_PROCEDURE=https://votre-instance.app.n8n.cloud/webhook/create-procedure
N8N_WEBHOOK_REQUEST_DOCS=https://votre-instance.app.n8n.cloud/webhook/request-docs
N8N_WEBHOOK_UPLOAD=https://votre-instance.app.n8n.cloud/webhook/upload
```

Utilisez `.env.example` comme référence.

4. **Configurer la base de données Supabase**

Exécutez les scripts SQL dans l'ordre suivant depuis le SQL Editor de Supabase :

```sql
-- 1. Créer le schéma de base
-- Exécutez scripts/schema.sql

-- 2. Configurer les politiques RLS
-- Exécutez scripts/cleanup-and-fix-rls.sql
```

5. **Créer votre premier utilisateur admin**

Après la première connexion via magic link, ajoutez manuellement votre profil dans Supabase :

```sql
INSERT INTO public.profiles (id, email, name, role)
VALUES (
  'votre-user-id-de-auth.users',
  'votre-email@example.com',
  'Votre Nom',
  'admin'
);
```

## 🏃 Démarrage

```bash
# Mode développement
pnpm dev

# Build de production
pnpm build

# Démarrer en production
pnpm start

# Formatage du code
pnpm format
```

Le site sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📁 Structure du projet

```
arythmeethic/
├── app/                      # App Router Next.js
│   ├── page.tsx             # Page d'accueil (vitrine)
│   ├── admin/               # Portail d'administration
│   │   ├── clients/         # Gestion des clients
│   │   │   └── [id]/       # Détails et édition client
│   │   └── login/          # Authentification
│   ├── api/                 # Routes API
│   └── auth/                # Callback auth Supabase
├── components/              # Composants réutilisables
├── lib/                     # Utilitaires et hooks
│   ├── hooks/              # Custom React hooks
│   ├── supabase-client.ts  # Client Supabase (côté client)
│   └── supabase-server.ts  # Client Supabase (côté serveur)
├── scripts/                 # Scripts SQL
└── types/                   # Types TypeScript
```

## 🔐 Authentification

- **Magic Links** via Supabase Auth
- Seuls les emails autorisés dans la table `profiles` peuvent se connecter
- Routes `/admin/*` protégées par middleware
- Redirection automatique vers `/admin/clients` après connexion

## 📊 Fonctionnalités

### Page d'accueil

- Vitrine pour les cours et formations
- Section services (domicile, école, expertise)
- Formulaire de contact

### Portail Admin

- **Clients** : Liste, création, modification, détails
- **Procédures** : Affichage par client avec statuts
- **Workflows n8n** : Boutons d'action (à connecter)

## 🚀 Déploiement sur Vercel

1. **Pusher le code sur GitHub**

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Connecter à Vercel**

- Aller sur [vercel.com](https://vercel.com)
- Importer le projet GitHub
- Configurer les variables d'environnement
- Déployer !

3. **Variables d'environnement Vercel**

Ajouter dans les settings du projet :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `N8N_WEBHOOK_CREATE_PROCEDURE`
- `N8N_WEBHOOK_REQUEST_DOCS`
- `N8N_WEBHOOK_UPLOAD`

4. **Configurer les redirections Supabase**

Dans Supabase Dashboard > Authentication > URL Configuration :

- Ajouter l'URL de production Vercel aux **Redirect URLs**

## 🔄 Intégration n8n

Les workflows n8n sont prêts à être connectés :

- Création de procédure
- Demande de documents
- Upload de fichiers

TODO: Implémenter les endpoints webhooks dans n8n.

## 📝 Licence

Projet privé - Tous droits réservés
