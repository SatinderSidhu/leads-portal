# Leads Portal - Project Guide

## Overview

A leads management system for KITLabs Inc. Two Next.js apps in a Turborepo monorepo:
- **Admin Portal** (`apps/admin`, port 3000) — Internal CRM for managing leads, emails, NDAs, SOWs, app flows, content
- **Customer Portal** (`apps/customer`, port 3001) — Public-facing portal where customers view project status, review/sign SOWs, view app flows, and sign NDAs

## Branding

- **Primary deep blue**: `#01358d`
- **Accent coral/pink**: `#f9556d`
- **Background gradient**: `from-[#2870a8] via-[#01358d] to-[#101b63]`
- **Logo**: `kitlabs-logo.jpg` (800x420, in both `apps/admin/public/` and `apps/customer/public/`)
- **Company**: KITLabs Inc, domain `kitlabs.us`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo (npm workspaces) |
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5.7 |
| UI | React 19, Tailwind CSS 4 |
| Database | PostgreSQL 16 + Prisma 6.x ORM |
| Email | Nodemailer (Gmail SMTP) |
| Auth | Session cookies + bcryptjs (admin + customer) |
| Rich Text | TipTap (@tiptap/react, @tiptap/starter-kit) |
| Flow Builder | @xyflow/react (admin: editable flows, customer: read-only viewer) |
| App Flow AI | Anthropic Claude API (SSE streaming JSON generation) |
| Doc Extraction | mammoth (DOCX→HTML), pdf-parse (PDF→text) |
| PDF | html2pdf.js (SOW PDF with full HTML rendering, both portals) + jsPDF (NDA PDF) |
| Image Export | html-to-image (PNG export for app flows on admin + customer) |
| Analytics | Google Analytics (G-8J4D4JHZGN on customer portal) |
| Deployment | Docker + Nginx + Let's Encrypt on single EC2 instance |
| CI/CD | GitHub Actions → ECR → EC2 via SSH |

## Project Structure

```
leads-portal/
├── apps/
│   ├── admin/           # Admin portal (port 3000)
│   │   ├── src/
│   │   │   ├── app/     # Next.js App Router pages & API routes
│   │   │   ├── components/  # AdminShell, Sidebar, Breadcrumbs, ThemeProvider, ThemeToggle, FlowBuilder, RichTextEditor, AppFlowBuilder, app-flow-nodes
│   │   │   └── lib/     # session.ts, email.ts, api-auth.ts, nda-template.ts, app-flow-prompt.ts, sow-prompt.ts, extract-file-text.ts, zoho.ts, notify.ts
│   │   ├── public/      # openapi.json, uploads/, kitlabs-logo.jpg
│   │   └── next.config.ts
│   └── customer/        # Customer portal (port 3001)
│       ├── src/
│       │   ├── app/     # Pages (login, register, project) + API routes (auth, nda, sow, app-flows)
│       │   ├── components/  # NdaSection.tsx, SowSection.tsx, AppFlowSection.tsx, ProjectFeedback.tsx, VisitTracker.tsx
│       │   └── lib/     # session.ts, email.ts, generate-pdf.ts
│       ├── public/      # kitlabs-logo.jpg
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
| Lead | leads | Core entity — projects/leads with status tracking, doNotContact flag |
| Note | notes | Comments on leads |
| StatusHistory | status_history | Audit trail of status changes |
| Nda | ndas | Non-disclosure agreements (one per lead) |
| LeadFile | lead_files | File attachments on leads |
| EmailTemplate | email_templates | Reusable email templates with HTML body |
| EmailFlow | email_flows | Visual email automation flows (JSON nodes/edges) |
| SentEmail | sent_emails | Email tracking (sent, opened, failed) |
| EmailAttachment | email_attachments | File attachments on sent emails |
| ReceivedEmail | received_emails | Inbound email replies via SES |
| SowTemplate | sow_templates | Reusable SOW format templates (HTML content, industry, project type, duration/cost range, isDefault flag) |
| ScopeOfWork | scope_of_works | SOW documents with versioning, signing (signedAt, signerName, signerIp) |
| SowComment | sow_comments | Customer/admin comments on SOW documents |
| AppFlow | app_flows | Visual app flow diagrams (JSON nodes/edges, BASIC or WIREFRAME type) |
| AppFlowComment | app_flow_comments | Customer/admin comments on app flows |
| LeadWatcher | lead_watchers | Join table for admin watch subscriptions on leads |
| BrandingConfig | branding_config | Company branding (logo, name, colors, footer, copyright) for SOW/App Flow docs |
| NextStep | next_steps | Task list per lead (content, dueDate, completed, completedAt, createdBy) |
| AuditLog | audit_logs | Complete audit trail per lead (action, detail, actor, timestamp) |
| ZohoConfig | zoho_config | Zoho CRM OAuth credentials, tokens, data center, org ID, enabled flag |
| CustomerVisit | customer_visits | Tracks customer portal page views (leadId, visitorEmail, page, timestamp) |
| NotificationPreference | notification_preferences | Per-admin notification toggles (9 event types) + optional notification email |
| PortfolioService | portfolio_services | Services offered by KITLabs (name, description, pitch scripts, documents, URLs) |
| PortfolioProject | portfolio_projects | Completed projects (title, description, category, domain, technologies, client, demo, scripts, docs) |
| Message | messages | Secure messaging between admin and customer (content, senderName, senderType, readAt) |
| EmailDraft | email_drafts | Saved email drafts per lead (subject, body, cc, bcc) |
| NaicsSector | naics_sectors | NAICS 2022 industry sector codes (20 sectors) |
| NaicsSubsector | naics_subsectors | NAICS 2022 subsector codes (96 subsectors, linked to sectors) |
| KnowledgeArticle | knowledge_articles | Knowledge base articles (title, slug, content, category, tags, published) |
| Content | content | Social media content posts |
| CustomerUser | customer_users | Customer portal users (email, name, password, leadIds) |

### Key Enums
- `LeadSource`: MANUAL, AGENT, BARK, LINKEDIN_SALES_NAV, APOLLO, LINKEDIN_COMPANY_PAGE, REFERRAL, WEBSITE, COLD_OUTREACH, EVENT, OTHER
- `LeadStatus`: NEW → SOW_READY → SOW_SIGNED → APP_FLOW_READY → DESIGN_READY → DESIGN_APPROVED → BUILD_IN_PROGRESS → BUILD_READY_FOR_REVIEW → BUILD_SUBMITTED → GO_LIVE | LOST | NO_RESPONSE | ON_HOLD | CANCELLED
- `LeadStage`: COLD, WARM, HOT, ACTIVE, CLOSED, NEW, CONTACTED, RESPONDED, MEETING_BOOKED, QUALIFIED, DISQUALIFIED, NURTURE
- `AppFlowType`: BASIC, WIREFRAME
- `NdaStatus`: GENERATED, SENT, SIGNED
- `SentEmailStatus`: SENT, OPENED, FAILED
- `EmailTemplatePurpose`: WELCOME, FOLLOW_UP, REMINDER, NOTIFICATION, PROMOTIONAL, OTHER

## Admin Portal Pages

| Route | Purpose |
|-------|---------|
| `/login` | Authentication |
| `/` | Activity feed — latest emails, status changes, notes across all leads |
| `/dashboard` | Leads grid with pagination, search, filters (status/stage/source/assignedTo), defaults to "My Leads" |
| `/leads/new` | Create lead (with optional "Also create in Zoho CRM" checkbox) |
| `/leads/[id]` | Lead detail — 3-column layout: lead info (left), communications/docs (center), status/notes/tasks/audit (right) |
| `/leads/[id]/nda` | NDA management |
| `/leads/[id]/sow-builder` | AI-powered SOW builder with Claude streaming, DOCX/PDF export |
| `/leads/[id]/app-flow-builder` | AI-powered app flow builder with ReactFlow canvas |
| `/admin-users` | User management |
| `/admin-users/new` | Create admin user |
| `/admin-users/[id]` | Edit admin user |
| `/profile` | My profile — picture, signature |
| `/sow-templates` | SOW template list (card grid with default badge, set default/edit/delete) |
| `/sow-templates/new` | Create SOW template (RichTextEditor for HTML content, metadata fields, preview) |
| `/sow-templates/[id]` | Edit SOW template |
| `/email-templates` | Template list |
| `/email-templates/new` | Create template |
| `/email-templates/[id]` | Edit template |
| `/email-flows` | Flow builder list |
| `/email-flows/new` | Create flow |
| `/email-flows/[id]` | Edit flow |
| `/content` | Content management |
| `/content/new` | Create content |
| `/content/[id]` | Edit content |
| `/branding` | Company branding settings (logo, name, colors, footer, copyright) |
| `/zoho-settings` | Zoho CRM integration settings (credentials, authorization, connection test, lead management tools) |
| `/zoho-settings/unlinked` | Find Portal leads that exist in Zoho but aren't linked — link them |
| `/zoho-settings/import` | Import leads from Zoho CRM that don't exist in Portal |
| `/zoho-settings/export` | Export Portal leads to Zoho CRM that aren't synced yet |
| `/notification-settings` | Per-admin notification preferences (9 event types, optional notification email) |
| `/portfolio` | Portfolio main page — services and projects tabs with card grid |
| `/portfolio/services/new` | Create new service (name, description, scripts, URLs, documents) |
| `/portfolio/services/[id]` | Service detail — pitch scripts, URLs, documents, linked projects |
| `/portfolio/projects/new` | Create/edit project (supports ?editId= and ?serviceId= params) |
| `/portfolio/projects/[id]` | Project detail — info, client, technologies, demo video, documents, pitch scripts |
| `/knowledge` | Knowledge base — searchable articles grouped by category, seed default articles |
| `/knowledge/[slug]` | Article detail with Markdown rendering, shareable URL, copy link button |
| `/knowledge/new` | Create/edit article with Markdown editor, category selector, slug auto-gen |
| `/messages` | Live Chat inbox — unread messages tab + all conversations tab, click to navigate to lead |
| `/naics-codes` | NAICS industry code browser — searchable, expandable sector/subsector accordion |
| `/api-docs` | Swagger UI |

## Admin API Routes

### Internal (session auth via cookie)
- `POST/DELETE /api/auth` — Login/logout
- `GET/POST /api/leads` — List/create leads
- `GET/PUT/DELETE /api/leads/[id]` — Lead CRUD
- `GET/POST /api/leads/[id]/notes` — Admin notes (internal, not shared with customer)
- `GET/POST/PUT/DELETE /api/leads/[id]/next-steps` — Next steps task list (create, toggle complete, delete)
- `GET /api/leads/[id]/audit` — Audit log (complete activity trail for a lead)
- `GET/POST /api/leads/[id]/files` — File uploads
- `DELETE /api/leads/[id]/files/[fileId]` — Delete file
- `GET/POST /api/leads/[id]/status` — Status changes (creates audit trail, notifies watchers)
- `POST /api/leads/[id]/welcome-email` — Send/resend welcome email to customer (logs in email history)
- `PUT /api/leads/[id]/assign` — Reassign lead to another admin (auto-adds watcher, sends email)
- `GET/POST/DELETE /api/leads/[id]/watch` — Watch list (subscribe/unsubscribe for lead updates)
- `GET/POST /api/leads/[id]/nda` — NDA operations
- `POST /api/leads/[id]/nda/send` — Send NDA email
- `GET/POST /api/leads/[id]/emails` — Send/list emails for lead
- `GET/POST /api/sow-templates` — SOW template list/create (POST with isDefault unsets previous default)
- `GET/PUT/DELETE /api/sow-templates/[id]` — SOW template CRUD (PUT with isDefault unsets other defaults)
- `GET/POST/PUT/DELETE /api/email-templates[/id]` — Template CRUD
- `GET/POST/PUT/DELETE /api/email-flows[/id]` — Flow CRUD
- `GET/POST/PUT/DELETE /api/content[/id]` — Content CRUD
- `POST /api/content/upload` — Media upload
- `GET/PUT /api/branding` — Get/update company branding config
- `POST /api/branding/upload-logo` — Upload company logo
- `GET /api/branding/public` — Public branding config (no auth, used by customer portal)
- `GET/PUT/DELETE /api/admin-users[/id]` — Admin user management
- `POST /api/admin-users/[id]/upload-picture` — Profile picture upload
- `GET /api/admin-users/me` — Current admin profile
- `GET /api/activity` — Unified activity feed (emails, status changes, notes)
- `GET/POST /api/leads/[id]/sow` — SOW list/upload
- `POST /api/leads/[id]/sow/[sowId]/share` — Share SOW with customer (sends email)
- `POST /api/leads/[id]/sow/generate` — AI SOW generation (SSE streaming)
- `POST /api/leads/[id]/sow/export-docx` — Export SOW as DOCX
- `GET/POST /api/leads/[id]/app-flows` — List/create app flows
- `GET/PUT/DELETE /api/leads/[id]/app-flows/[flowId]` — Single app flow CRUD
- `POST /api/leads/[id]/app-flows/[flowId]/share` — Share app flow with customer
- `GET/POST /api/leads/[id]/app-flows/[flowId]/comments` — App flow comments
- `POST /api/leads/[id]/app-flows/generate` — AI app flow generation (SSE streaming)
- `GET/PUT /api/zoho/config` — Get/update Zoho CRM credentials and settings
- `POST /api/zoho/config` — Authorize (exchange grant token) or test connection
- `GET /api/zoho/status` — Quick check if Zoho integration is enabled
- `POST /api/zoho/create-lead` — Create a lead in Zoho CRM (maps fields, stores zohoLeadId)
- `GET /api/zoho/search-lead?leadId=X` — Check if lead exists in Zoho (by email), auto-links if found
- `POST /api/zoho/sync-lead` — Bidirectional sync: compares timestamps, pushes/pulls whichever is newer
- `GET /api/zoho/find-unlinked` — Find Portal leads with matching Zoho records (by email) not yet linked
- `POST /api/zoho/find-unlinked` — Link a Portal lead to a Zoho record
- `GET /api/zoho/import-leads` — Fetch all Zoho leads not in Portal (for import)
- `POST /api/zoho/import-leads` — Import a Zoho lead into Portal (creates lead + links)
- `GET /api/zoho/export-leads` — List Portal leads not yet in Zoho (for export)
- `POST /api/zoho/export-leads` — Export a Portal lead to Zoho (creates in Zoho + links)
- `GET/PUT /api/notifications/preferences` — Get/update admin notification preferences
- `GET/POST /api/portfolio/services` — List/create portfolio services
- `GET/PUT/DELETE /api/portfolio/services/[id]` — Service CRUD with linked projects
- `GET/POST /api/portfolio/projects` — List/create portfolio projects (filter by ?serviceId=)
- `GET/PUT/DELETE /api/portfolio/projects/[id]` — Project CRUD
- `GET/POST /api/leads/[id]/messages` — Secure messaging with customer (list/send, marks as read)
- `GET/POST/PUT/DELETE /api/leads/[id]/drafts` — Email draft management per lead
- `GET /api/naics` — List all NAICS sectors with subsectors
- `POST /api/naics/seed` — Seed NAICS 2022 codes (20 sectors, 96 subsectors)
- `GET/POST /api/knowledge` — Knowledge base articles (search, category filter)
- `GET/PUT/DELETE /api/knowledge/[id]` — Article CRUD (supports slug lookup)
- `POST /api/knowledge/seed` — Seed 12 default feature articles
- `GET /api/dashboard` — Dashboard stats (total leads, my leads, new today/week, engagement, needs attention, my tasks, pipeline distribution)
- `GET /api/track/[id]` — Email open tracking pixel (also triggers customer_response notification)
- `POST /api/webhooks/ses-inbound` — SES inbound email webhook

### External API (Bearer token auth via API_TOKEN)
- `GET /api/v1/leads` — List leads (supports filters: status, stage, source, industry, assignedTo, search)
- `POST /api/v1/leads` — Create lead (accepts all expanded fields incl. jobTitle, companyName, industry, outreach tracking; validates leadSource/leadStatus enums)
- `GET/POST /api/v1/content` — Content endpoints
- `POST /api/v1/content/upload` — Upload media

## Customer Portal

Multi-page portal with session-based authentication (bcryptjs + cookie). Google Analytics (G-8J4D4JHZGN) integrated via Next.js Script component.

### Pages
| Route | Purpose |
|-------|---------|
| `/` | Landing — project list (logged in) or login/register prompt; redirects `?id=X` to `/project?id=X` for backward compat |
| `/login` | Customer login |
| `/register` | Customer registration (optional `?leadId=` to pre-link a project) |
| `/project` | Project detail with tab navigation (Overview, SOW, App Flow, NDA, Book Meeting) via `?id=X&tab=Y` |

### Features
- **Registration** auto-links leads by matching customer email address
- **Tab navigation**: Overview (status, timeline, comments), Scope of Work, App Flow, NDA, Book Meeting
- Old email links (`?id=leadId`) preserved via redirect from `/` to `/project`
- SOW file paths converted to absolute URLs using `ADMIN_PORTAL_URL` env var

### SOW Features (Customer Portal)
- Version selector with "Latest" badge
- AI-generated SOW rendered in auto-resizing iframe (`SowHtmlPreview`)
- PDF files previewed inline; Word docs show download prompt
- **Comments**: customers can leave comments per SOW version, with email notification to admin
- **Approve & Sign**: digital signature modal (name, IP, timestamp), updates status to `SOW_SIGNED`, email to both admin and customer
- **PDF Download**: AI-generated SOW content exported to PDF via jsPDF
- **Full Screen**: overlay mode for AI-generated and PDF SOWs

### App Flow Features (Customer Portal)
- Read-only ReactFlow canvas with custom node types (BasicNode, WireframeNode)
- Flow selector dropdown when multiple flows shared
- **Comments**: customers can leave comments per flow, with email notification to admin
- **Full Screen**: overlay mode with canvas controls
- **PNG Download**: export flow diagram as PNG via html-to-image
- **PDF Download**: export flow diagram as PDF via html-to-image + jsPDF

### Customer API Routes
- `POST /api/auth` — Login
- `DELETE /api/auth` — Logout
- `GET /api/auth?logout=1` — Logout via link (server-rendered pages)
- `POST /api/auth/register` — Register (auto-links leads by email)
- `GET /api/auth/me` — Current session
- `GET /api/nda?leadId=X` — Fetch NDA
- `POST /api/nda/sign` — Sign NDA (captures name, IP)
- `GET /api/sow?leadId=X` — Fetch shared SOWs
- `GET/POST /api/sow/[sowId]/comments` — SOW comments (list/add)
- `POST /api/sow/[sowId]/sign` — Approve & sign SOW
- `GET /api/app-flows?leadId=X` — Fetch shared app flows with comments
- `POST /api/app-flows/[flowId]/comments` — Add comment to app flow
- `GET/POST /api/notes?leadId=X` — Customer comments/feedback on project overview
- `GET/POST /api/messages?leadId=X` — Customer secure messaging (list/send, marks admin messages as read)
- `POST /api/track-visit` — Track customer portal visit (rate-limited 30min per lead/email, notifies watchers)
- `GET /api/branding` — Public branding config for document rendering (reads from shared DB)

## Key Lib Files

| File | Exports |
|------|---------|
| `apps/admin/src/lib/session.ts` | `getAdminSession()` — reads session cookie, returns admin user |
| `apps/admin/src/lib/email.ts` | `sendWelcomeEmail()`, `sendStatusUpdateEmail()`, `sendNdaReadyEmail()`, `sendAdminWelcomeEmail()`, `sendSowReadyEmail()`, `sendAppFlowReadyEmail()`, `sendLeadAssignedEmail()` |
| `apps/admin/src/lib/watcher-notifications.ts` | `notifyWatchers()` — central utility to email watchers + assigned admin on lead updates |
| `apps/admin/src/lib/api-auth.ts` | `validateToken()`, `unauthorized()` — Bearer token auth for v1 API |
| `apps/admin/src/lib/nda-template.ts` | `generateNdaContent()` — NDA text template |
| `apps/admin/src/lib/sow-prompt.ts` | `buildSowPrompt()` — AI prompt for SOW generation; accepts optional `templateContent` to override default structure |
| `apps/admin/src/lib/app-flow-prompt.ts` | `buildAppFlowPrompt()` — AI prompt for generating app flow JSON nodes/edges |
| `apps/admin/src/lib/sow-prompt.ts` | `buildSowPrompt()` — AI prompt for SOW generation (supports editor template, file reference, both, or default) |
| `apps/admin/src/lib/extract-file-text.ts` | `extractFileContent()` — Extracts text/HTML from uploaded PDF (pdf-parse) or DOCX (mammoth) files |
| `apps/admin/src/lib/zoho.ts` | `getZohoConfig()`, `getAccessToken()`, `createZohoLead()`, `updateZohoLead()`, `getZohoLead()`, `searchZohoLead()`, `getZohoLeadUrl()`, `isZohoEnabled()` — Zoho CRM OAuth + API + bidirectional sync |
| `apps/admin/src/lib/notify.ts` | `sendNotification()` — Central notification dispatcher; checks admin preferences before sending, supports broadcast and lead-specific events |
| `apps/admin/src/lib/audit.ts` | `logAudit()` — Non-blocking audit trail logger for all lead write operations |
| `apps/customer/src/lib/session.ts` | `getCustomerSession()` — reads customer-session cookie, returns CustomerSession |
| `apps/customer/src/lib/email.ts` | `sendNdaSignedEmail()`, `sendSowCommentNotification()`, `sendSowSignedNotification()`, `sendAppFlowCommentNotification()`, `notifyLeadWatchers()` |
| `apps/customer/src/lib/generate-pdf.ts` | `downloadNdaPdf()`, `downloadSowPdf()` — jsPDF generation |
| `packages/database/src/index.ts` | Singleton `PrismaClient` export |

## Key Components

| Component | File | Notes |
|-----------|------|-------|
| AdminShell | `apps/admin/src/components/AdminShell.tsx` | Layout wrapper: sidebar + sticky breadcrumb bar + main content area. Excluded on /login |
| Sidebar | `apps/admin/src/components/Sidebar.tsx` | Fixed left nav (w-56): logo, New Lead button, grouped nav links, theme toggle, logout |
| Breadcrumbs | `apps/admin/src/components/Breadcrumbs.tsx` | Auto-generated from URL path, handles UUIDs as "Lead Detail", clickable parent segments |
| RichTextEditor | `apps/admin/src/components/RichTextEditor.tsx` | TipTap editor with visual/code toggle, syncs external content changes via useEffect |
| FlowBuilder | `apps/admin/src/components/FlowBuilder.tsx` | @xyflow drag-and-drop email flow builder |
| AppFlowBuilder | `apps/admin/src/components/AppFlowBuilder.tsx` | @xyflow app flow editor with AI sidebar, save, PNG download |
| BasicNode / WireframeNode | `apps/admin/src/components/app-flow-nodes.tsx` | Custom ReactFlow node types for app flows |
| ThemeProvider | `apps/admin/src/components/ThemeProvider.tsx` | Dark mode context provider |
| NdaSection | `apps/customer/src/components/NdaSection.tsx` | NDA display + signing UI |
| SowSection | `apps/customer/src/components/SowSection.tsx` | SOW viewer with comments, signing, full-screen, PDF download |
| AppFlowSection | `apps/customer/src/components/AppFlowSection.tsx` | Read-only flow viewer with comments, full-screen, PNG/PDF download |
| ProjectFeedback | `apps/customer/src/components/ProjectFeedback.tsx` | Customer comment box on project overview tab, notifies admin watchers |
| VisitTracker | `apps/customer/src/components/VisitTracker.tsx` | Invisible component that tracks customer portal visits on page load |
| ChatWidget | `apps/customer/src/components/ChatWidget.tsx` | Floating chat bubble (bottom-right) for customer-admin secure messaging |

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
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`, `AWS_REGION`, `EC2_HOST`, `EC2_SSH_KEY`, `DB_PASSWORD`, `SESSION_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `API_TOKEN`, `DOMAIN_ADMIN`, `DOMAIN_CUSTOMER`, `ANTHROPIC_API_KEY`

### Manual EC2 Operations
```bash
ssh -i leads-portal-key.pem ubuntu@100.52.66.158
cd ~/leads-portal
docker compose logs -f admin       # View logs
docker compose restart admin       # Restart service
docker compose exec db pg_dump -U postgres leads_portal > backup.sql  # DB backup
```

## Email System
- Templates support `{{customerName}}`, `{{projectName}}`, `{{phone}}`, `{{city}}`, `{{status}}`, `{{stage}}`, `{{source}}`, `{{dateCreated}}` placeholders
- Email compose on lead detail page has RichTextEditor with code/visual toggle
- "Include signature" checkbox appends admin's email signature (set in profile page)
- Signature appended server-side in the email API route
- Relative image paths (`/uploads/...`) converted to absolute URLs before sending (for Gmail compatibility)
- Email open tracking via 1x1 pixel at `/api/track/[sentEmailId]`
- **Email history logging**: Welcome, NDA, SOW share, and App Flow share emails are automatically logged as SentEmail records and appear in the lead's email history
- **Resend welcome email**: Send/Resend button on lead detail page next to "Welcome Email" status; creates SentEmail record
- **Customer Portal URL**: Displayed on lead detail page with copy button; allows admin to preview the customer's portal view
- Preview modal renders email HTML in an iframe
- From address uses logged-in admin's name as display name (e.g. `"Satinder Sidhu" <leads@kitlabs.us>`)
- Reply-To uses lead-specific `reply+{leadId}@reply.kitlabs.us` for SES inbound routing, wrapped with admin's display name
- Inbound email replies processed via SES → SNS → `/api/webhooks/ses-inbound` webhook, stored as ReceivedEmail

### Email Notifications (Customer-Facing)
| Trigger | Function | Location | Recipients |
|---------|----------|----------|------------|
| Welcome email | `sendWelcomeEmail()` | admin email.ts | Customer |
| Status change | `sendStatusUpdateEmail()` | admin email.ts | Customer |
| NDA ready | `sendNdaReadyEmail()` | admin email.ts | Customer |
| SOW ready | `sendSowReadyEmail()` | admin email.ts | Customer |
| App flow ready | `sendAppFlowReadyEmail()` | admin email.ts | Customer |
| NDA signed | `sendNdaSignedEmail()` | customer email.ts | Customer + Admin |
| SOW signed | `sendSowSignedNotification()` | customer email.ts | Customer + Admin |

### Admin Notifications (Preference-Aware via `sendNotification()`)
All admin notifications respect per-admin preferences in `NotificationPreference` table. Admins can opt out of any event type at `/notification-settings`.

| Event | Pref Key | Recipients | Trigger Location |
|-------|----------|-----------|-----------------|
| New lead created | `newLeadCreated` | All admins (broadcast) | `POST /api/leads` |
| Email sent to customer | `emailSentToCustomer` | Watchers + assigned | `POST /api/leads/[id]/emails` |
| Customer opens email | `customerResponse` | Watchers + assigned | `GET /api/track/[id]` (pixel) |
| Customer replies | `customerResponse` | Watchers + assigned | `POST /api/webhooks/ses-inbound` |
| Customer portal visit | `customerPortalVisit` | Watchers + assigned | `POST /api/track-visit` (30min rate limit) |
| Customer comment | `customerComment` | Watchers + assigned | `notifyLeadWatchers()` in customer email.ts |
| Lead status change | `leadStatusChange` | Watchers + assigned | `notifyWatchers()` in watcher-notifications.ts |
| Lead assigned | `leadAssigned` | Assigned admin | `PUT /api/leads/[id]/assign` |
| SOW signed | `sowSigned` | Watchers + assigned | `POST /api/sow/[sowId]/sign` |
| NDA signed | `ndaSigned` | Watchers + assigned | `POST /api/nda/sign` |

## Lead Assignment & Watch List
- Leads are auto-assigned to the creating admin and that admin is auto-added as a watcher
- Assignment can be changed from lead detail page via dropdown (all active admins)
- Reassignment sends email to new assignee and auto-adds them as watcher
- Dashboard defaults to "My Leads" (`assignedTo=me`) with dropdown to switch to "All Leads" or a specific admin
- Watch button on lead detail page lets admins subscribe/unsubscribe for updates
- Watchers (+ assigned admin) get notified on: status changes, new notes, customer comments (SOW + app flow)
- Central `notifyWatchers()` utility in admin, lightweight `notifyLeadWatchers()` in customer portal
- `LeadWatcher` join table with `@@unique([leadId, adminId])` constraint

## SOW Template System
- Admin creates reusable SOW templates via `/sow-templates` with HTML content (RichTextEditor), metadata (industry, project type, duration range, cost range), and a description
- One template can be marked as **default** (`isDefault: true`) — setting a new default automatically unsets the previous one
- In the SOW builder (`/leads/[id]/sow-builder`), a template dropdown appears in the left panel with the default pre-selected
- Admin can preview the selected template inline before generating
- When generating with AI, the selected template's HTML content is injected into the system prompt, instructing Claude to follow the template's structure, section order, and formatting exactly
- If no template is selected, the AI falls back to the built-in default structure (Executive Summary, Scope of Work, Timeline, etc.)
- Templates support categorization by industry, project type, duration, and cost range for easy selection

## App Flow System
- Two flow types: **Basic** (flowchart boxes with label/description) and **Wireframe** (realistic mobile screen mockups)
- Admin creates flows via `/leads/[id]/app-flow-builder` with AI generation or manual node placement
- AI generates JSON `{ nodes, edges }` via Claude API (SSE streaming)
- Custom ReactFlow node components: `BasicNode` (teal border, rounded box) and `WireframeNode` (phone-shaped frame with notch, status bar, typed UI elements, home indicator)
- **Wireframe UI elements**: 17 typed element renderers — nav-bar, heading, text, input, button, button-outline, image, avatar, search, card, list, tab-bar, toggle, divider, checkbox, radio, social-login, map
- **Wireframe layout**: horizontal left-to-right storyboard (x increments by 280), handles on Left/Right sides
- **Basic layout**: vertical top-to-bottom flowchart (x at 100/400/700 for branching, y increments by 200)
- Backward compatible with old string-based wireframe elements
- Flows are saved to `AppFlow` model with JSON nodes/edges
- Sharing: sets `sharedAt`/`sharedBy`, optionally updates lead status to `APP_FLOW_READY`, sends email
- Customer views read-only flow with pan/zoom, comments, full-screen, PNG/PDF export
- Node types registered as `{ basicNode: BasicNode, wireframeNode: WireframeNode }` — must match in both admin and customer

## Branding System
- Single-row `BrandingConfig` table stores company name, logo, website, colors, footer text, copyright
- Seeded with KITLabs Inc defaults (logo, colors, footer, copyright with `{year}` placeholder)
- Admin manages branding at `/branding` — logo upload, color pickers, footer/copyright fields, live preview
- Logo uploaded to `public/uploads/branding/` via `/api/branding/upload-logo`
- Copyright text supports `{year}` placeholder (replaced at render time)
- **SOW generation**: branding injected into AI prompt — company name, logo URL, colors, footer/copyright appear in generated HTML
- **App Flow generation**: company name passed to AI prompt for splash screen / branding references
- **Customer portal PDF exports**: SOW, NDA, and App Flow PDFs include branded header (company name, website) and footer (footer text, copyright) using branding colors
- Customer portal fetches branding via `/api/branding` (direct DB query, no cross-portal HTTP needed)
- Logo path converted to absolute URL using `ADMIN_PORTAL_URL` for customer portal rendering
- Existing documents keep their original branding; only new documents use updated branding

## Zoho CRM Integration
- OAuth 2.0 authentication via Self Client (server-to-server, no user interaction)
- Credentials stored in `ZohoConfig` table (not env vars — updatable without redeploying)
- Access tokens auto-refresh using long-lived refresh token (tokens expire in 1 hour)
- Supports all 6 Zoho data centers (US, EU, IN, AU, JP, CA)
- **Setup**: Admin configures at `/zoho-settings` — enter Client ID/Secret, paste grant token to authorize, test connection
- **New leads**: "Also create in Zoho CRM" checkbox on `/leads/new` (defaults to checked when Zoho enabled)
- **Existing leads**: Lead detail page shows Zoho status — "Sync with Zoho" + "View in Zoho" if linked, or "Create in Zoho" if not
- **Auto-detection**: On lead detail page load, searches Zoho by customer email and auto-links if found
- **Bidirectional sync**: "Sync with Zoho" button compares `updatedAt` (Portal) vs `Modified_Time` (Zoho), syncs whichever is newer. Shows changed fields with before/after values. Auto-dismisses result after 5-10s
- **Field mapping** (Portal → Zoho): customerName → First_Name/Last_Name, customerEmail → Email, companyName/projectName → Company, phone → Phone, city → City, zip → Zip_Code, projectDescription → Description, source → Lead_Source, jobTitle → Designation, industry → Industry, companyWebsite → Website, location → State
- **Reverse mapping** (Zoho → Portal): First_Name+Last_Name → customerName, Designation → jobTitle, Company → companyName, State → location, Industry → industry, Website → companyWebsite (Lead_Source NOT reverse-mapped to avoid lossy many-to-one)
- `zohoLeadId` on Lead model stores the Zoho record ID for direct linking
- Zoho lead URL uses `zgid` (not API internal `id`) for correct CRM web URLs
- **Lead Management Tools** on `/zoho-settings`:
  - **Find & Link** (`/zoho-settings/unlinked`): Scan Portal leads, search Zoho by email, link matches individually or bulk
  - **Import from Zoho** (`/zoho-settings/import`): Fetch all Zoho leads with pagination, show those not in Portal, import individually or bulk. Handles email collision by linking instead of duplicating
  - **Export to Zoho** (`/zoho-settings/export`): List Portal leads without `zohoLeadId`, create in Zoho individually or bulk
- See `docs/zoho-setup-guide.md` for complete Zoho admin setup instructions

## Customer Portal Features
- **Book Meeting**: Tab with embedded Zoho Bookings iframe (satinder-kitlabs.zohobookings.com)
- **Project Feedback**: Comment box on Overview tab replacing AI description enhancer; customers leave manual comments, admin watchers notified via email
- **Notes API**: `POST /api/notes` creates notes on lead with `createdBy: "Name (Customer)"` to distinguish from admin notes
- **Visit Tracking**: `VisitTracker` component fires `POST /api/track-visit` on project page load; rate-limited to 1 notification per lead per 30 minutes; notifies watchers + assigned admin

## Expanded Lead Fields
- **Core contact**: jobTitle, companyName, location (broader than city)
- **Company intelligence**: industry, companySize, companyWebsite
- **Lead management**: extractedDate (auto-set by API), lastContactedDate, leadScore (1-100)
- **Outreach tracking**: connectionRequestSent, connectionAccepted, initialMessageSent, meetingBooked, meetingDate, responseReceived
- Lead detail page shows outreach tracking as colored badge pills in view mode
- New lead page organized into sections: Contact Info, Company Info, Project Details, Lead Classification
- Dashboard filters updated for all new LeadSource and LeadStage values

## Notification System
- **NotificationPreference** model: per-admin toggles for 9 event types + optional notification email override
- All notifications default to ON (no preference record = all enabled)
- Admin configures at `/notification-settings` — toggle individual events, set notification email, enable/disable all
- **Central dispatcher** (`notify.ts`): `sendNotification()` checks each admin's preferences before sending
- Supports two modes: `broadcastToAll` (all active admins, e.g. new lead) or lead-specific (watchers + assigned admin)
- Notification email override: if `notificationEmail` is set in preferences, emails go there instead of profile email
- Customer portal `notifyLeadWatchers()` also checks preferences before sending comment notifications

## Admin Notes & Next Steps
- **Admin Notes**: Internal notes on a lead, not visible to customers. Notes history shown above the input area with author name and date. Watchers notified when notes are added.
- **Next Steps**: Task list per lead. Admin creates next steps with optional due date. Each step can be toggled as completed (with completion date). Overdue tasks highlighted in red, completed in green. Steps can be deleted. Sorted: incomplete first, then by due date, then by creation date.
- Both sections are in the right sidebar of the lead detail page

## Audit Log
- **AuditLog** model tracks all write operations on a lead: created, updated, email sent, NDA sent, SOW shared, app flow shared, status changed, notes added/edited/deleted, next steps, customer actions (comments, NDA/SOW signed), email opened by customer, customer portal visits
- Audit logged from 16+ API routes (admin + customer) — non-blocking `.catch(() => {})`
- `GET /api/leads/[id]/audit` returns up to 100 most recent entries
- Displayed in right sidebar of lead detail page as a compact scrollable timeline
- Each entry shows: action name, detail (truncated), actor name, timestamp
- Customer engagement events: "Email Opened by Customer" (with subject + timestamp), "Customer Portal Visit" (with visitor name + tab)

## Do Not Contact
- `doNotContact` boolean field on Lead model (default false)
- **Auto-enabled** when status changes to LOST, NO_RESPONSE, ON_HOLD, or CANCELLED
- **Blocks all outbound communication**: email compose (button disabled), welcome email send/resend (hidden), NDA send (403), SOW share (403), App Flow share (403), notify customer checkbox (disabled with "blocked" label)
- **Red banner** on lead detail page when enabled with "Disable" button
- Admin must manually disable doNotContact before contacting the customer again
- Toggle logged in audit trail ("Do Not Contact Enabled/Disabled")

## Lead Statuses
- **Active pipeline**: NEW → SOW_READY → SOW_SIGNED → APP_FLOW_READY → DESIGN_READY → DESIGN_APPROVED → BUILD_IN_PROGRESS → BUILD_READY_FOR_REVIEW → BUILD_SUBMITTED → GO_LIVE
- **Closed statuses**: LOST (went with competitor), NO_RESPONSE (stopped responding), ON_HOLD (paused — may return), CANCELLED (dropped the project)
- Closed statuses auto-enable Do Not Contact flag

## Email History Logging
- Welcome, NDA, SOW share, and App Flow share emails are logged as SentEmail records
- Appear in the lead's email conversation thread alongside manually composed emails
- Resend welcome email: Send/Resend button on lead detail page, creates SentEmail record

## SOW PDF Generation
- Uses html2pdf.js (not jsPDF plain text) for full HTML rendering in PDFs
- Preserves headings, bold, tables, lists, images with CSS styling
- Logo images converted to base64 data URLs before capture (avoids cross-origin issues)
- Image size constrained to max-width 250px in PDF, 280px in preview
- Applied to both admin SOW builder and customer portal PDF downloads

## Lead Detail Page Layout
- **2-column responsive layout** using CSS Grid `xl:grid-cols-12` (50/50 split on xl screens)
- **Left column (xl:col-span-6)**: Project details, customer portal URL, email compose/thread, files, SOW, app flows
- **Right column (xl:col-span-6)**: 2-col sub-grid with Status/History side-by-side, NDA, Do Not Contact banner, admin notes + next steps side-by-side, audit log
- On mobile/tablet: single column with all sections stacked
- Full-width layout (no max-width constraint) with AdminShell padding

## Portfolio System
- **PortfolioService**: KITLabs services with name, description, email/phone/meeting pitch scripts, documents (JSON array of {name, url}), URLs (JSON array of {label, url})
- **PortfolioProject**: Completed projects linked to a service, with title, description, category, domain, technologies (JSON array), client info, demo video URL, documents, pitch scripts, completion date
- Service detail page: tabbed pitch scripts with Copy button, clickable URLs with copy icon, document links, linked projects grid
- Project detail page: 2-column layout (info+client on left, scripts on right), technology tags, demo video, documents
- Edit project via `?editId=` query param; pre-link to service via `?serviceId=`
- Portfolio list page with Services/Projects tabs and card grid

## Dashboard
- **GET /api/dashboard**: aggregates stats from leads, emails, visits, notes, audit logs, tasks
- Personalized greeting with time-of-day ("Good morning, {name}!")
- Stat cards: Total Leads, My Leads, New Today, This Week, Active Pipeline, My Tasks, Needs Attention
- Customer engagement (24h): Emails Opened, Portal Visits, Comments, Replies
- **My Tasks**: pending tasks assigned to current admin, overdue highlighted
- **Needs Attention**: leads with recent customer activity (email opens, portal visits, comments, NDA/SOW signed)
- **Pipeline Overview**: horizontal bar chart by lead status
- Recent Activity feed with "View All Activity" link

## Task Assignment
- `assignedToId` FK on NextStep model (to AdminUser)
- Tasks default to current admin but can be assigned to any active admin
- Assignment dropdown in "Add Step" form and inline reassign on each task
- Email notification sent to assignee when task is created or reassigned
- Tasks show in "My Tasks" section on dashboard (pending, overdue highlighted)
- Audit logged: "Task Created", "Task Reassigned", "Task Completed", "Task Deleted"

## Admin Portal Navigation
- **Collapsible sidebar**: expanded (w-56), collapsed (w-16 icons only), hover-expand when collapsed
- Collapse state persisted to localStorage, toggle button with directional arrows
- **Sticky breadcrumb bar** at top showing current page path (auto-generated from URL)
- **AdminShell** layout wrapper in root layout — wraps all pages except /login
- Pages no longer have individual headers/nav — sidebar handles all navigation
- Nav groups: Dashboard/Leads/Activity/Portfolio, Templates (Email, SOW, Flows, Content), NAICS Codes, Knowledge Base, Settings (Branding, Zoho, Notifications), Users (Admin Users, Profile)

## Live Chat / Secure Messaging
- **Message** model: leadId, content, senderName, senderType (admin/customer), readAt for read receipts
- **Customer portal**: ChatWidget floating bubble (bottom-right), auto-opens after 10s, requires sign-in
  - Adaptive polling: 5s when chat is open, 15s when closed
  - Sound notification when new admin message arrives
- **Admin portal**:
  - Messages section on lead detail page with 5s polling (live chat feel)
  - **"Live Chat"** nav item in sidebar with real-time unread count badge (polls 15s)
  - **Dedicated /messages page**: Unread tab (all unread with NEW badges) + All Conversations tab (grouped by lead)
  - **"Unread Chats"** stat card on dashboard (clickable → /messages)
- Do Not Contact blocks admin replies
- Email notifications: customer message → admin watchers; admin reply → customer
- Audit logged: "Customer Message Received", "Message Sent to Customer"
- "Notifications" renamed to "Communications" in sidebar

## Email Drafts
- **EmailDraft** model: leadId, subject, body, cc, bcc, createdBy, timestamps
- Save Draft / Update Draft button next to Send in compose form
- Drafts list shown as amber cards below Compose Email button
- Click draft to load into compose form, multiple drafts per lead
- CRUD API: `GET/POST/PUT/DELETE /api/leads/[id]/drafts`

## NAICS Industry Classification
- **NaicsSector** (20 sectors) + **NaicsSubsector** (96 subsectors) models from NAICS 2022
- naics-data.json extracted from Excel reference file, seeded via `POST /api/naics/seed`
- Lead fields: `naicsSectorCode`, `naicsSubsectorCode` — cascading dropdowns in edit mode
- View mode: indigo/teal badges showing sector and subsector names
- Management page at `/naics-codes` with searchable accordion browser
- Lead also has `aboutCompany` text field for company description

## Knowledge Base
- **KnowledgeArticle** model: title, slug (unique, shareable URL), content (Markdown), category, tags
- 12 default articles seeded via `POST /api/knowledge/seed` covering all features
- Categories: Getting Started, Lead Management, Email System, SOW & Documents, Integrations, Settings, Collaboration, Sales Tools
- Article detail with client-side Markdown rendering (headers, bold, italic, code, tables, lists)
- "Share Link" button copies slug-based URL (e.g., `/knowledge/creating-lead`)
- Full-text search across title and content, category pill filters
- Create/edit articles with Markdown editor

## Customer Portal Design
- **Wider layout**: max-w-6xl (1152px) instead of max-w-4xl (896px)
- **Welcome message**: personalized with project name, warm description of portal purpose
- **Status badge**: frosted glass card showing current project status
- **KITLabs Resources section**: 5 product cards (Portfolio, Cost Estimator, App Builder, Digital Card, Support Portal) + quick links (Services, Industries, About, Contact, Book Meeting)
- **Footer**: KITLabs logo, company name, dynamic copyright year

## Important Patterns
- All admin API routes use `getAdminSession()` for auth (returns null if not logged in)
- Customer API routes use `getCustomerSession()` for auth
- Customer API routes must verify resource ownership via `leadId: { in: session.leadIds as string[] }`
- Database seed is idempotent (checks by title/username before inserting)
- File uploads go to `public/uploads/` (admin), volume-mounted in Docker
- Nginx serves `/uploads/` directly from shared Docker volume (Next.js production doesn't serve dynamically added files)
- Nginx `client_max_body_size` set to 50M for file uploads
- Dark mode supported via ThemeProvider + ThemeToggle
- RichTextEditor uses `lastContentRef` to prevent infinite update loops when syncing external content
- Swagger/OpenAPI spec at `public/openapi.json`, UI at `/api-docs`
- Leads API supports pagination (`page`, `limit`), search, and filters (`status`, `stage`, `source`)
- SOW uploads saved to `public/uploads/sow/` with auto-incrementing version numbers
- Customer portal uses `ADMIN_PORTAL_URL` env var for cross-domain file access (SOW documents)
- AI-generated SOW content stored as HTML in `ScopeOfWork.content` field (no file)
- SOW templates support optional file upload (PDF/DOCX) as reference documents, stored in `public/uploads/sow-templates/`
- When generating SOW with a template that has an uploaded file, the file content is extracted (DOCX→HTML via mammoth, PDF→text via pdf-parse) and injected into the AI prompt as a formatting reference
- SOW prompt handles 4 scenarios: both editor template + file content, file only, editor template only, or default structure
- Full-screen views use `fixed inset-0 z-50` overlay pattern with exit button in header bar
- Admin notes are internal only — customer portal filters notes by `createdBy` ending with "(Customer)"
- Do Not Contact flag blocks all outbound emails at the API level (returns 403)
- SOW PDF generation uses html2pdf.js with base64 image conversion for cross-origin logo support
