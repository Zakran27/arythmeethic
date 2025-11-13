# A Rythme Ethic (Arythmeethic)

Plateforme de gestion pour cours à domicile et interventions en établissement scolaire avec workflows automatisés.

## Tech Stack

- **Next.js 15** - App Router with TypeScript
- **Chakra UI** - Component library with theming
- **Supabase** - Authentication, PostgreSQL database, file storage
- **n8n** - Workflow automation via webhooks

## Features

### Current

- Magic link authentication via Supabase Auth
- Client management (create, list, view details)
- Procedure tracking by client with status workflow
- Protected admin routes with middleware
- Responsive UI with loading states

### Planned (n8n Integration)

- Automated procedure creation workflows
- PDF contract generation
- E-signature requests via Yousign
- Document upload and processing
- Email notifications

## Installation

### Prerequisites

- Node.js 18+
- pnpm package manager
- Supabase project
- n8n instance

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
```

### Environment Variables

Configure `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

N8N_BASE_URL=your-n8n-instance-url
N8N_WEBHOOK_CREATE_PROCEDURE=/webhook/procedure-create
N8N_WEBHOOK_REQUEST_DOCS=/webhook/request-docs
N8N_WEBHOOK_UPLOAD=/webhook/upload
N8N_WEBHOOK_YOUSIGN=/webhook/yousign
```

### Supabase Auth Configuration

In Supabase Dashboard → Authentication → URL Configuration, add:

**Site URL:** `http://localhost:3000`

**Redirect URLs:**

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/**` (wildcard for all paths)

For production, add your production domain URLs.

### Database Setup

Execute `scripts/schema.sql` in Supabase SQL Editor to create:

- Tables (profiles, clients, procedures, documents, audit_log)
- Procedure types (NEW_CLIENT, RENEWAL, etc.)
- Row Level Security policies
- Sample data

### Storage Configuration

Create a storage bucket in Supabase:

- **Name:** `client-files`
- **Public:** false
- **File size limit:** 10MB

### Admin Access

After first login with magic link, grant admin role:

```sql
-- Get your user ID
SELECT id FROM auth.users WHERE email = 'your@email.com';

-- Grant admin role
INSERT INTO public.profiles (id, email, role)
VALUES ('USER_UUID_HERE', 'your@email.com', 'admin');
```

### Development

```bash
# Start dev server
pnpm dev

# Seed sample data (optional)
pnpm seed

# Format code
pnpm format

# Build for production
pnpm build
```

## Project Structure

```
app/
├── page.tsx                      # Public landing page
├── layout.tsx                    # Root layout with Chakra UI
├── admin/
│   ├── layout.tsx               # Protected admin layout
│   ├── login/page.tsx           # Email authentication
│   ├── clients/
│   │   ├── page.tsx             # Client list
│   │   ├── ClientsTable.tsx     # Data table component
│   │   ├── NewClientModal.tsx   # Client creation form
│   │   └── [id]/page.tsx        # Client details + procedures
│   └── procedures/              # Procedure pages
└── api/n8n/                     # Webhook endpoints

components/
├── Nav.tsx                       # Navigation bar
├── AdminShell.tsx                # Admin layout wrapper
├── DataTable.tsx                 # Reusable table
├── StatusBadge.tsx               # Status display
└── ConfirmDialog.tsx             # Confirmation modal

lib/
├── supabase-client.ts            # Browser Supabase client
├── supabase-server.ts            # Server Supabase client
├── hooks/
│   ├── useClients.ts            # Client data fetching
│   └── useClientDetail.ts       # Client + procedures
├── env.ts                        # Environment validation
└── auth.ts                       # Auth helpers

middleware.ts                     # Route protection
types/index.ts                    # TypeScript definitions
scripts/
├── schema.sql                    # Database schema
└── seed.mjs                      # Sample data
```

## Architecture

### Authentication

- Magic link flow via Supabase Auth
- Middleware protects `/admin/*` routes
- Session-based access control with automatic redirect

### Data Layer

- Client-side React hooks for data fetching
- Direct Supabase queries with RLS enforcement
- Loading and error states on all operations

### Security

- Row Level Security (RLS) enforces admin-only access
- Service role key isolated to server-side code
- Environment variable validation with Zod
- Protected routes with middleware

## Database Schema

### Tables

- **profiles** - User roles and permissions
- **clients** - Student/organization records
- **procedure_types** - Procedure categories
- **procedures** - Workflow instances with status
- **documents** - File metadata and storage refs
- **audit_log** - Event tracking

### Procedure Status Flow

```
DRAFT → PDF_GENERATED → SIGN_REQUESTED → SIGNED | REFUSED | EXPIRED → CLOSED
```

## n8n Webhook Integration

### Create Procedure

`POST /webhook/procedure-create`

Triggers procedure workflow with PDF generation and Yousign signature.

```json
{
  "procedureId": "uuid",
  "mode": "full | pdf_only | yousign_only",
  "contractVars": {
    "clientFullName": "string",
    "address": "string",
    "rate": 50,
    "hours": 10,
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }
}
```

### Request Documents

`POST /webhook/request-docs`

Generates time-limited upload link for client documents.

```json
{
  "procedureId": "uuid",
  "required": ["ID", "ProofOfAddress"]
}
```

### Document Upload

`POST /webhook/upload`

Processes uploaded documents and triggers workflows.

```json
{
  "procedureId": "uuid",
  "title": "string",
  "kind": "CONTRACT | SUPPORTING_DOC",
  "fileUrl": "signed-url"
}
```

## Roadmap

### Phase 1: n8n Integration

- [ ] Connect procedure creation to n8n workflows
- [ ] PDF generation via Puppeteer/PDFKit
- [ ] Yousign e-signature integration
- [ ] Email notifications

### Phase 2: Document Management

- [ ] File upload to Supabase Storage
- [ ] Document preview and download
- [ ] Version control
- [ ] Post-upload processing

### Phase 3: Enhancement

- [ ] Client self-service portal
- [ ] Procedure templates
- [ ] Multi-user permissions
- [ ] Real-time updates (Supabase Realtime)
- [ ] Analytics dashboard
- [ ] Data export

## License

MIT
