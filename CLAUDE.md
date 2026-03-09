# Leads Portal - Project Guide

## Overview

A leads management system for KITLabs Inc. Two Next.js apps in a Turborepo monorepo:
- **Admin Portal** (`apps/admin`, port 3000) — Internal CRM for managing leads, emails, NDAs, content
- **Customer Portal** (`apps/customer`, port 3001) — Public-facing portal where customers view project status and sign NDAs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo (npm workspaces) |
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5.7 |
| UI | React 19, Tailwind CSS 4 |
| Database | PostgreSQL 16 + Prisma 6.x ORM |
| Email | Nodemailer (Gmail SMTP) |
| Auth | Session cookies + bcryptjs (admin), no auth (customer — accessed via lead ID) |
| Rich Text | TipTap (@tiptap/react, @tiptap/starter-kit) |
| Flow Builder | @xyflow/react (drag-and-drop visual email flows) |
| PDF | jsPDF (NDA PDF generation on customer side) |
| Deployment | Docker + Nginx + Let's Encrypt on single EC2 instance |
| CI/CD | GitHub Actions → ECR → EC2 via SSH |

## Project Structure

```
leads-portal/
├── apps/
│   ├── admin/           # Admin portal (port 3000)
│   │   ├── src/
│   │   │   ├── app/     # Next.js App Router pages & API routes
│   │   │   ├── components/  # ThemeProvider, ThemeToggle, FlowBuilder, RichTextEditor
│   │   │   └── lib/     # session.ts, email.ts, api-auth.ts, nda-template.ts
│   │   ├── public/      # openapi.json, uploads/
│   │   └── next.config.ts
│   └── customer/        # Customer portal (port 3001)
│       ├── src/
│       │   ├── app/     # Single page + NDA API routes
│       │   ├── components/  # NdaSection.tsx
│       │   └── lib/     # email.ts, generate-pdf.ts
│       └── next.config.ts
├── packages/
│   └── database/        # Shared Prisma schema + client
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.ts  # Default admin user + email templates
│       └── src/index.ts # PrismaClient singleton export
├── scripts/
│   ├── aws-setup.sh     # EC2/ECR/IAM provisioning
│   ├── init-ssl.sh      # First-time SSL cert setup
│   └── start-admin.sh   # Production: prisma db push → seed → start
├── nginx/conf.d/        # Nginx configs (template, initial, active)
├── docker-compose.prod.yml
├── Dockerfile           # Multi-stage (deps → prisma → admin-builder → customer-builder → admin → customer)
└── .github/workflows/deploy.yml  # CI/CD pipeline
```

## Database Models

| Model | Table | Purpose |
|-------|-------|---------|
| AdminUser | admin_users | Admin portal users (name, email, username, password, profilePicture, emailSignature) |
| Lead | leads | Core entity — projects/leads with status tracking |
| Note | notes | Comments on leads |
| StatusHistory | status_history | Audit trail of status changes |
| Nda | ndas | Non-disclosure agreements (one per lead) |
| LeadFile | lead_files | File attachments on leads |
| EmailTemplate | email_templates | Reusable email templates with HTML body |
| EmailFlow | email_flows | Visual email automation flows (JSON nodes/edges) |
| SentEmail | sent_emails | Email tracking (sent, opened, failed) |
| Content | content | Social media content posts |

### Key Enums
- `LeadSource`: MANUAL, AGENT, BARK
- `LeadStatus`: NEW → DESIGN_READY → DESIGN_APPROVED → BUILD_IN_PROGRESS → BUILD_READY_FOR_REVIEW → BUILD_SUBMITTED → GO_LIVE
- `LeadStage`: COLD, WARM, HOT, ACTIVE, CLOSED
- `NdaStatus`: GENERATED, SENT, SIGNED
- `SentEmailStatus`: SENT, OPENED, FAILED
- `EmailTemplatePurpose`: WELCOME, FOLLOW_UP, REMINDER, NOTIFICATION, PROMOTIONAL, OTHER

## Admin Portal Pages

| Route | Purpose |
|-------|---------|
| `/login` | Authentication |
| `/dashboard` | Main leads grid view |
| `/leads/new` | Create lead |
| `/leads/[id]` | Lead detail — edit, notes, files, email compose, status |
| `/leads/[id]/nda` | NDA management |
| `/admin-users` | User management |
| `/admin-users/new` | Create admin user |
| `/admin-users/[id]` | Edit admin user |
| `/profile` | My profile — picture, signature |
| `/email-templates` | Template list |
| `/email-templates/new` | Create template |
| `/email-templates/[id]` | Edit template |
| `/email-flows` | Flow builder list |
| `/email-flows/new` | Create flow |
| `/email-flows/[id]` | Edit flow |
| `/content` | Content management |
| `/content/new` | Create content |
| `/content/[id]` | Edit content |
| `/api-docs` | Swagger UI |

## Admin API Routes

### Internal (session auth via cookie)
- `POST/DELETE /api/auth` — Login/logout
- `GET/POST /api/leads` — List/create leads
- `GET/PUT/DELETE /api/leads/[id]` — Lead CRUD
- `GET/POST /api/leads/[id]/notes` — Notes
- `GET/POST /api/leads/[id]/files` — File uploads
- `DELETE /api/leads/[id]/files/[fileId]` — Delete file
- `GET/POST /api/leads/[id]/status` — Status changes (creates audit trail)
- `GET/POST /api/leads/[id]/nda` — NDA operations
- `POST /api/leads/[id]/nda/send` — Send NDA email
- `GET/POST /api/leads/[id]/emails` — Send/list emails for lead
- `GET/POST/PUT/DELETE /api/email-templates[/id]` — Template CRUD
- `GET/POST/PUT/DELETE /api/email-flows[/id]` — Flow CRUD
- `GET/POST/PUT/DELETE /api/content[/id]` — Content CRUD
- `POST /api/content/upload` — Media upload
- `GET/PUT/DELETE /api/admin-users[/id]` — Admin user management
- `POST /api/admin-users/[id]/upload-picture` — Profile picture upload
- `GET /api/admin-users/me` — Current admin profile
- `GET /api/track/[id]` — Email open tracking pixel

### External API (Bearer token auth via API_TOKEN)
- `GET /api/v1/leads` — List leads
- `GET/POST /api/v1/content` — Content endpoints
- `POST /api/v1/content/upload` — Upload media

## Customer Portal

Single page at `/` — accessed via `?id=<leadId>` query parameter. Shows:
- Project details and current status
- Status history timeline
- Admin notes
- NDA signing section (if NDA exists)

Customer API routes:
- `GET /api/nda?leadId=X` — Fetch NDA
- `POST /api/nda/sign` — Sign NDA (captures name, IP)

## Key Lib Files

| File | Exports |
|------|---------|
| `apps/admin/src/lib/session.ts` | `getAdminSession()` — reads session cookie, returns admin user |
| `apps/admin/src/lib/email.ts` | `sendWelcomeEmail()`, `sendStatusUpdateEmail()`, `sendNdaReadyEmail()`, `sendAdminWelcomeEmail()` |
| `apps/admin/src/lib/api-auth.ts` | `validateToken()`, `unauthorized()` — Bearer token auth for v1 API |
| `apps/admin/src/lib/nda-template.ts` | `generateNdaContent()` — NDA text template |
| `apps/customer/src/lib/email.ts` | `sendNdaSignedEmail()` — confirmation after NDA signing |
| `apps/customer/src/lib/generate-pdf.ts` | `downloadNdaPdf()` — jsPDF NDA generation |
| `packages/database/src/index.ts` | Singleton `PrismaClient` export |

## Key Components

| Component | File | Notes |
|-----------|------|-------|
| RichTextEditor | `apps/admin/src/components/RichTextEditor.tsx` | TipTap editor with visual/code toggle, syncs external content changes via useEffect |
| FlowBuilder | `apps/admin/src/components/FlowBuilder.tsx` | @xyflow drag-and-drop email flow builder |
| ThemeProvider | `apps/admin/src/components/ThemeProvider.tsx` | Dark mode context provider |
| NdaSection | `apps/customer/src/components/NdaSection.tsx` | NDA display + signing UI |

## Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Run both apps in dev mode
npm run dev
# Admin: http://localhost:3000
# Customer: http://localhost:3001

# Build
npm run build
```

### Local Database
PostgreSQL runs on **port 5433** locally (not the default 5432).
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/leads_portal
```

### Default Admin Credentials (from seed)
- Username: `admin`
- Password: `admin`

## Production Deployment

### Architecture
```
Internet → Nginx (SSL/Let's Encrypt) → Admin (:3000) + Customer (:3001)
                                      → PostgreSQL (:5432, internal)
```
All on a single EC2 instance via Docker Compose. Cost: ~$10-18/mo.

### Live URLs
- Admin: `https://leadsportaladmin.kitlabs.us`
- Customer: `https://leadsportal.kitlabs.us`
- Elastic IP: `100.52.66.158`

### CI/CD Pipeline (`.github/workflows/deploy.yml`)
On push to `main`:
1. Build Docker images (multi-stage Dockerfile, targets: `admin` and `customer`)
2. Push to AWS ECR (tagged with commit SHA + latest)
3. SSH into EC2, pull images, `docker compose up -d`
4. Health check (curl admin:3000 and customer:3001)

### Key Deployment Details
- ECR URL constructed from `AWS_ACCOUNT_ID` + `AWS_REGION` (not from job output, to avoid GitHub Actions masking)
- Admin container runs `scripts/start-admin.sh` on startup: `prisma db push` → `seed.ts` → `npm start`
- SSL cert stored under `/etc/letsencrypt/live/leadsportaladmin.kitlabs.us/` (covers both domains)
- Nginx config uses `certbot-webroot` shared volume for ACME challenges
- Both `next.config.ts` files include `turbopack: { root: path.resolve(__dirname, "../..") }` for monorepo Docker builds

### GitHub Secrets Required
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`, `AWS_REGION`, `EC2_HOST`, `EC2_SSH_KEY`, `DB_PASSWORD`, `SESSION_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `API_TOKEN`, `DOMAIN_ADMIN`, `DOMAIN_CUSTOMER`

### Manual EC2 Operations
```bash
ssh -i leads-portal-key.pem ubuntu@100.52.66.158
cd ~/leads-portal
docker compose logs -f admin       # View logs
docker compose restart admin       # Restart service
docker compose exec db pg_dump -U postgres leads_portal > backup.sql  # DB backup
```

## Email System
- Templates support `{{customerName}}` and `{{projectName}}` placeholders
- Email compose on lead detail page has RichTextEditor with code/visual toggle
- "Include signature" checkbox appends admin's email signature (set in profile page)
- Signature appended server-side in the email API route
- Email open tracking via 1x1 pixel at `/api/track/[sentEmailId]`
- Preview modal renders email HTML in an iframe

## Important Patterns
- All API routes use `getAdminSession()` for auth (returns null if not logged in)
- Database seed is idempotent (checks by title/username before inserting)
- File uploads go to `public/uploads/` (admin), volume-mounted in Docker
- Dark mode supported via ThemeProvider + ThemeToggle
- RichTextEditor uses `lastContentRef` to prevent infinite update loops when syncing external content
- Swagger/OpenAPI spec at `public/openapi.json`, UI at `/api-docs`
