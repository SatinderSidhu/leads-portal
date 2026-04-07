# Technical Requirements Document (TRD)

## Leads Portal — Technical Architecture & Implementation

| Field | Detail |
|-------|--------|
| Document Version | 1.8 |
| Last Updated | March 13, 2026 |
| Status | Active |

---

## 1. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js (App Router) | 16.x |
| UI Library | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Database | PostgreSQL | 16 |
| ORM | Prisma | 6.x |
| Password Hashing | bcryptjs | 3.x |
| Email | Nodemailer (SMTP/Gmail) | 8.x |
| Monorepo Tool | Turborepo | 2.x |
| Package Manager | npm workspaces | 11.x |
| API Docs | swagger-ui-react | Latest |
| Doc Extraction | mammoth (DOCX→HTML), pdf-parse (PDF→text) | Latest |
| Analytics | Google Analytics (gtag.js) | GA4 |
| Containerization | Docker + Docker Compose | Latest |
| Runtime | Node.js | 20 (Alpine) |

---

## 2. Architecture Overview

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DOCKER ENVIRONMENT                       │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   Admin Portal    │  │ Customer Portal  │  │  PostgreSQL  │  │
│  │   (Next.js)       │  │   (Next.js)      │  │   Database   │  │
│  │   Port: 3000      │  │   Port: 3001     │  │  Port: 5432  │  │
│  │                   │  │                  │  │              │  │
│  │  ┌─────────────┐  │  │  ┌────────────┐  │  │  ┌────────┐  │  │
│  │  │ Middleware   │  │  │  │ SSR Page   │  │  │  │ leads  │  │  │
│  │  │ (Auth Guard) │  │  │  │ (Welcome)  │  │  │  │ table  │  │  │
│  │  └─────────────┘  │  │  └────────────┘  │  │  └────────┘  │  │
│  │  ┌─────────────┐  │  │        │         │  │      ▲       │  │
│  │  │ API Routes  │  │  │        │         │  │      │       │  │
│  │  │ /api/auth   │  │  │        ▼         │  │      │       │  │
│  │  │ /api/leads  │──│──│──── Prisma ORM ──│──│──────┘       │  │
│  │  └─────────────┘  │  │                  │  │              │  │
│  │  ┌─────────────┐  │  │                  │  │              │  │
│  │  │ Nodemailer  │  │  │                  │  │              │  │
│  │  │ (SMTP/Gmail)│  │  │                  │  │              │  │
│  │  └──────┬──────┘  │  │                  │  │              │  │
│  └─────────│─────────┘  └──────────────────┘  └──────────────┘  │
│            │                                                     │
└────────────│─────────────────────────────────────────────────────┘
             │
             ▼
      ┌──────────────┐
      │  Gmail SMTP  │
      │  Server      │
      └──────────────┘
```

### 2.2 Monorepo Structure

```
leads-portal/
├── package.json                    # Root: npm workspaces config
├── turbo.json                      # Turborepo pipeline config
├── docker-compose.yml              # Docker services definition
├── Dockerfile                      # Multi-stage Docker build
├── .env                            # Environment variables (git-ignored)
├── .gitignore
├── .dockerignore
├── docs/
│   ├── BRD.md                      # Business Requirements Document
│   └── TRD.md                      # Technical Requirements Document
├── scripts/
│   └── start-admin.sh              # Docker startup script (runs migrations)
├── apps/
│   ├── admin/                      # Admin Portal (Next.js)
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── middleware.ts           # Auth middleware
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ThemeProvider.tsx # Dark/light theme context with localStorage
│   │       │   └── ThemeToggle.tsx  # Sun/moon toggle button
│   │       ├── lib/
│   │       │   ├── api-auth.ts     # Shared Bearer token validation helpers
│   │       │   ├── email.ts        # Nodemailer utility (welcome, status, NDA, admin welcome)
│   │       │   ├── session.ts      # Admin session helper (cookie → AdminUser lookup)
│   │       │   ├── sow-prompt.ts   # AI prompt builder for SOW generation
│   │       │   ├── app-flow-prompt.ts # AI prompt builder for app flow generation
│   │       │   └── extract-file-text.ts # PDF/DOCX content extraction (mammoth + pdf-parse)
│   │       └── app/
│   │           ├── layout.tsx       # Root layout
│   │           ├── globals.css      # Global styles
│   │           ├── page.tsx         # Redirects to /dashboard
│   │           ├── login/
│   │           │   └── page.tsx     # Login form
│   │           ├── api-docs/
│   │           │   └── page.tsx     # Swagger UI (public)
│   │           ├── admin-users/
│   │           │   ├── page.tsx     # Admin users list
│   │           │   ├── new/
│   │           │   │   └── page.tsx # Create admin user form
│   │           │   └── [id]/
│   │           │       └── page.tsx # Edit admin user
│   │           ├── dashboard/
│   │           │   └── page.tsx     # Leads grid (clickable rows)
│   │           ├── content/
│   │           │   ├── page.tsx     # Content list
│   │           │   ├── new/
│   │           │   │   └── page.tsx # Create content form
│   │           │   └── [id]/
│   │           │       └── page.tsx # Content detail/edit
│   │           ├── leads/
│   │           │   ├── new/
│   │           │   │   └── page.tsx # Create lead form
│   │           │   └── [id]/
│   │           │       └── page.tsx # Lead detail (status, notes, history)
│   │           └── api/
│   │               ├── admin-users/
│   │               │   ├── route.ts     # GET list, POST create
│   │               │   └── [id]/
│   │               │       └── route.ts # GET, PUT, DELETE admin user
│   │               ├── auth/
│   │               │   └── route.ts # POST login (DB-backed bcrypt), DELETE logout
│   │               ├── content/
│   │               │   ├── route.ts     # GET all, POST create
│   │               │   ├── [id]/
│   │               │   │   └── route.ts # GET, PUT, DELETE
│   │               │   └── upload/
│   │               │       └── route.ts # POST file upload
│   │               ├── v1/
│   │               │   ├── leads/
│   │               │   │   └── route.ts # POST create lead (external API)
│   │               │   └── content/
│   │               │       ├── route.ts     # GET, POST (external API)
│   │               │       ├── [id]/
│   │               │       │   └── route.ts # GET, PUT, DELETE (external API)
│   │               │       └── upload/
│   │               │           └── route.ts # POST upload (external API)
│   │               └── leads/
│   │                   ├── route.ts # GET all, POST create
│   │                   └── [id]/
│   │                       ├── route.ts       # GET single lead, PUT edit, DELETE
│   │                       ├── status/
│   │                       │   └── route.ts   # PATCH status update
│   │                       ├── notes/
│   │                       │   └── route.ts   # POST add note
│   │                       └── nda/
│   │                           ├── route.ts   # POST generate, GET retrieve, PATCH edit NDA
│   │                           └── send/
│   │                               └── route.ts # POST send NDA email
│   └── customer/                   # Customer Portal (Next.js)
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       └── src/
│           ├── lib/
│           │   ├── email.ts         # NDA signed email notifications
│           │   └── generate-pdf.ts  # Client-side PDF generation (jspdf)
│           ├── components/
│           │   └── NdaSection.tsx   # NDA view, PDF download, e-signature form
│           └── app/
│               ├── layout.tsx       # Root layout
│               ├── globals.css      # Global styles
│               ├── page.tsx         # Welcome page (SSR) + NDA tab
│               └── api/
│                   └── nda/
│                       ├── route.ts      # GET NDA by leadId
│                       └── sign/
│                           └── route.ts  # POST sign NDA
└── packages/
    └── database/                   # Shared Database Package
        ├── package.json
        ├── tsconfig.json
        ├── prisma/
        │   ├── schema.prisma       # Database schema
        │   └── seed.ts             # Seeds initial admin user (admin/admin)
        └── src/
            └── index.ts            # PrismaClient singleton
```

---

## 3. Database Design

### 3.1 Schema Diagram

```
┌────────────────────────────────────────┐       ┌──────────────────────────────┐
│               leads                     │       │           notes              │
├────────────────────────────────────────┤       ├──────────────────────────────┤
│ id                 UUID    PK DEFAULT  │──┐    │ id          UUID   PK DEFAULT│
│ project_name       VARCHAR NOT NULL    │  │    │ content     TEXT   NOT NULL  │
│ customer_name      VARCHAR NOT NULL    │  ├───>│ lead_id     UUID   FK        │
│ customer_email     VARCHAR NOT NULL    │  │    │ created_at  TIMESTAMP DEFAULT│
│ project_description TEXT   NOT NULL    │  │    └──────────────────────────────┘
│ source             LeadSource DEFAULT  │  │
│ status             LeadStatus DEFAULT  │  │
│ email_sent         BOOLEAN DEFAULT false│  │    ┌──────────────────────────────┐
│ created_at         TIMESTAMP DEFAULT now│  │    │       status_history         │
│ updated_at         TIMESTAMP AUTO      │  │    ├──────────────────────────────┤
└────────────────────────────────────────┘  │    │ id          UUID   PK DEFAULT│
                                            │    │ from_status LeadStatus NULL  │
  LeadSource ENUM: MANUAL | AGENT           │    │ to_status   LeadStatus       │
                                            │
  LeadStatus ENUM:                          │
  NEW | DESIGN_READY | DESIGN_APPROVED |    ├───>│ lead_id     UUID   FK        │
  BUILD_IN_PROGRESS | BUILD_READY_FOR_  |   │    │ created_at  TIMESTAMP DEFAULT│
  REVIEW | BUILD_SUBMITTED | GO_LIVE        │    └──────────────────────────────┘
                                            │
```

### 3.2 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ContentStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum Platform {
  LINKEDIN
  FACEBOOK
  TIKTOK
  INSTAGRAM
}

enum NdaStatus {
  GENERATED
  SENT
  SIGNED
}

enum LeadSource {
  MANUAL
  AGENT
}

enum LeadStatus {
  NEW
  DESIGN_READY
  DESIGN_APPROVED
  BUILD_IN_PROGRESS
  BUILD_READY_FOR_REVIEW
  BUILD_SUBMITTED
  GO_LIVE
}

model AdminUser {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  username  String   @unique
  password  String
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("admin_users")
}

model Lead {
  id                 String       @id @default(uuid())
  projectName        String       @map("project_name")
  customerName       String       @map("customer_name")
  customerEmail      String       @map("customer_email")
  projectDescription String       @map("project_description") @db.Text
  source             LeadSource   @default(MANUAL)
  status             LeadStatus   @default(NEW)
  emailSent          Boolean      @default(false) @map("email_sent")
  createdBy          String?      @map("created_by")
  updatedBy          String?      @map("updated_by")
  createdAt          DateTime     @default(now()) @map("created_at")
  updatedAt          DateTime     @updatedAt @map("updated_at")
  notes              Note[]
  statusHistory      StatusHistory[]
  nda                Nda?

  @@map("leads")
}

model Note {
  id        String   @id @default(uuid())
  content   String   @db.Text
  leadId    String   @map("lead_id")
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  createdBy String?  @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("notes")
}

model StatusHistory {
  id         String      @id @default(uuid())
  fromStatus LeadStatus? @map("from_status")
  toStatus   LeadStatus  @map("to_status")
  leadId     String      @map("lead_id")
  lead       Lead        @relation(fields: [leadId], references: [id], onDelete: Cascade)
  changedBy  String?     @map("changed_by")
  createdAt  DateTime    @default(now()) @map("created_at")

  @@map("status_history")
}

model Nda {
  id         String    @id @default(uuid())
  leadId     String    @unique @map("lead_id")
  lead       Lead      @relation(fields: [leadId], references: [id], onDelete: Cascade)
  content    String    @db.Text
  status     NdaStatus @default(GENERATED)
  signerName String?   @map("signer_name")
  signerIp   String?   @map("signer_ip")
  signedAt   DateTime? @map("signed_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  @@map("ndas")
}

model SowTemplate {
  id          String   @id @default(uuid())
  name        String
  description String?  @db.Text
  content     String   @db.Text
  industry    String?
  projectType String?  @map("project_type")
  durationRange String? @map("duration_range")
  costRange   String?  @map("cost_range")
  isDefault   Boolean  @default(false) @map("is_default")
  createdBy   String?  @map("created_by")
  updatedBy   String?  @map("updated_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("sow_templates")
}

model Content {
  id        String        @id @default(uuid())
  title     String
  body      String        @db.Text
  mediaUrl  String?       @map("media_url")
  mediaFile String?       @map("media_file")
  tags      Json          @default("[]")
  platforms Platform[]
  status    ContentStatus @default(DRAFT)
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")

  @@map("content")
}
```

### 3.3 Design Decisions

| Decision | Rationale |
|----------|-----------|
| UUID for primary key | Non-sequential IDs prevent enumeration attacks on the customer portal |
| `@map` annotations | Clean snake_case in PostgreSQL, camelCase in TypeScript |
| `LeadStatus` enum | Type-safe status values enforced at database level |
| `Note` model | Append-only notes (no edit/delete) for audit trail |
| `StatusHistory` model | Full history of status changes with timestamps |
| `onDelete: Cascade` | Notes and history are deleted when a lead is removed |
| `@db.Text` for description | Allows long-form project descriptions without VARCHAR limits |
| Prisma `$transaction` | Atomic status updates — lead status and history record created together |
| `Nda` model | One-to-one with Lead (`@unique` on leadId), stores full NDA text and e-signature data |
| `NdaStatus` enum | Tracks NDA lifecycle: GENERATED → SENT → SIGNED |
| Client-side PDF | `jspdf` generates PDF in-browser — no server-side rendering needed |
| `LeadSource` enum | Tracks lead origin: MANUAL (admin UI) vs AGENT (external API) |
| Bearer token auth | Simple token-based auth for external API — no OAuth complexity needed |
| `/api/v1/` prefix | Versioned API path for external integrations, separate from internal routes |
| `Content` model | Standalone model for social media content, supports file upload and platform targeting |
| `ContentStatus` enum | Tracks content lifecycle: DRAFT → PUBLISHED → ARCHIVED |
| `Platform` enum array | PostgreSQL native array for multi-platform targeting |
| `Json` for tags | Simple array storage without separate Tag model |
| `swagger-ui-react` | Interactive API docs at `/api-docs`, loads static OpenAPI spec |
| `SowTemplate` model | Reusable SOW format templates — HTML content injected into AI system prompt for consistent formatting |
| `isDefault` boolean | Only one template can be default; API enforces uniqueness by unsetting previous default on change |
| Template content as HTML | Stored as HTML (same as RichTextEditor output) so it can be previewed and directly injected into AI prompt |
| `AdminUser` model | Database-backed admin accounts replacing hardcoded credentials |
| `bcryptjs` | Pure JS bcrypt implementation — no native dependencies, works everywhere |
| Audit fields as strings | Store admin name (not FK) — simpler, no cascade issues if admin deleted |
| Session cookie `userId:secret` | Identifies admin for audit trail while validating via SESSION_SECRET |
| Inline lead editing | Edit mode toggles on same page — no separate edit page needed |
| Hard delete for leads | Cascade deletes notes, statusHistory, NDA — simplest approach |

---

## 4. Authentication Architecture

### 4.1 Auth Flow Diagram

```
                    ┌──────────────┐
                    │  Browser     │
                    │  Request     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Next.js     │
                    │  Middleware   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ /login   │ │ /api/auth│ │ All other│
        │ (public) │ │ (public) │ │ routes   │
        └──────────┘ └──────────┘ └────┬─────┘
                                       │
                                ┌──────┴──────┐
                                │ Has valid   │
                                │ cookie?     │
                                └──────┬──────┘
                                  │         │
                                 YES        NO
                                  │         │
                                  ▼         ▼
                            ┌────────┐ ┌────────────┐
                            │ Allow  │ │ Redirect   │
                            │ access │ │ to /login  │
                            └────────┘ └────────────┘
```

### 4.2 Implementation Details

| Component | Detail |
|-----------|--------|
| Strategy | Cookie-based session with database-backed admin users |
| Cookie Name | `admin-session` |
| Cookie Value | `adminUserId:SESSION_SECRET` (identifies admin for audit trail) |
| Cookie Flags | `httpOnly`, `secure` (in production), `path=/`, `maxAge=86400` |
| Password Storage | bcryptjs hash (10 salt rounds) |
| Public Paths | `/login`, `/api/auth`, `/api/v1`, `/api-docs` |
| Middleware Matcher | All routes except `_next/static`, `_next/image`, `favicon.ico` |

### 4.3 Session Helper

**File:** `apps/admin/src/lib/session.ts`

```typescript
// Extracts admin user info from session cookie
// Returns { id, name, username } or null
// Used by API routes for audit trail (createdBy, updatedBy, changedBy)
export async function getAdminSession(): Promise<AdminSession | null>
```

### 4.4 API Endpoints

#### `POST /api/auth` — Login

```
Request:  { "username": string, "password": string }
Validation: Looks up AdminUser by username, bcrypt-compares password, checks active=true
Response: { "success": true, "name": string } (200) | { "error": "Invalid credentials" } (401)
Side Effect: Sets admin-session cookie with adminUserId:sessionSecret
```

#### `DELETE /api/auth` — Logout

```
Request:  (none)
Response: { "success": true } (200)
Side Effect: Clears admin-session cookie
```

---

## 5. API Design

### 5.1 Leads API

#### `GET /api/leads` — List All Leads

```
Auth:     Required (middleware-enforced)
Response: Lead[] (sorted by createdAt DESC)
```

#### `POST /api/leads` — Create Lead

```
Auth:     Required (middleware-enforced)
Request:  {
  "projectName": string,
  "customerName": string,
  "customerEmail": string,
  "projectDescription": string,
  "sendEmail": boolean
}
Response: Lead (201)
```

**Flow:**

```
Receive POST request
    ↓
Validate & create lead in database (status = NEW)
    ↓
Create initial StatusHistory record (fromStatus: null, toStatus: NEW)
    ↓
sendEmail === true?
    ├── YES → Send welcome email via Nodemailer
    │         ├── Success → Update emailSent = true, return lead (201)
    │         └── Failure → Log error, return lead with emailWarning (201)
    └── NO  → Return lead (201)
```

### 5.2 Single Lead API

#### `GET /api/leads/[id]` — Get Lead Details

```
Auth:     Required (middleware-enforced)
Response: Lead with notes[], statusHistory[], and nda (sorted by createdAt DESC)
404:      { "error": "Lead not found" }
```

#### `PUT /api/leads/[id]` — Edit Lead

```
Auth:     Required (middleware-enforced)
Request:  {
  "projectName"?: string,
  "customerName"?: string,
  "customerEmail"?: string,
  "projectDescription"?: string
}
Response: Lead (200)
404:      { "error": "Lead not found" }
400:      { "error": "Validation failed", "details": string[] }
Side Effect: Sets updatedBy to current admin's name
```

#### `DELETE /api/leads/[id]` — Delete Lead

```
Auth:     Required (middleware-enforced)
Response: { "success": true } (200)
404:      { "error": "Lead not found" }
Side Effect: Cascade deletes all associated notes, statusHistory, and NDA
```

#### `PATCH /api/leads/[id]/status` — Update Lead Status

```
Auth:     Required (middleware-enforced)
Request:  {
  "status": LeadStatus,   // e.g. "DESIGN_READY"
  "sendEmail": boolean     // notify customer via email
}
Response: Lead (200)
404:      { "error": "Lead not found" }
```

**Flow:**

```
Receive PATCH request
    ↓
Find lead by ID (404 if not found)
    ↓
Transaction:
  ├── Update lead.status
  └── Create StatusHistory record (fromStatus → toStatus)
    ↓
sendEmail === true?
    ├── YES → Send status update email
    │         ├── Success → Return updated lead
    │         └── Failure → Return lead with emailWarning
    └── NO  → Return updated lead
```

#### `POST /api/leads/[id]/notes` — Add Note

```
Auth:     Required (middleware-enforced)
Request:  { "content": string }
Response: Note (201)
404:      { "error": "Lead not found" }
```

### 5.3 NDA API

#### `POST /api/leads/[id]/nda` — Generate NDA (Admin)

```
Auth:     Required (middleware-enforced)
Request:  (none — NDA is auto-generated from template)
Response: Nda (201)
409:      { "error": "NDA already exists for this lead" }
```

**Flow:**

```
Receive POST request
    ↓
Find lead by ID (404 if not found)
    ↓
Check no existing NDA (409 if exists)
    ↓
Generate NDA content from template (company name, customer, project, date)
    ↓
Create NDA record (status = GENERATED)
    ↓
Send NDA Ready email to customer
    ↓
Update NDA status to SENT
    ↓
Return NDA (201)
```

#### `GET /api/leads/[id]/nda` — Get NDA (Admin)

```
Auth:     Required (middleware-enforced)
Response: Nda (200)
404:      { "error": "NDA not found" }
```

#### `GET /api/nda?leadId=...` — Get NDA (Customer Portal)

```
Auth:     None (customer portal)
Response: Nda with lead details (200)
404:      { "error": "NDA not found" }
```

#### `POST /api/nda/sign` — Sign NDA (Customer Portal)

```
Auth:     None (customer portal)
Request:  { "leadId": string, "signerName": string }
Response: Nda (200)
400:      { "error": "NDA has already been signed" }
```

**Recorded data:** Signer name, IP address (from headers), timestamp.

**Post-sign:** Confirmation emails sent to both customer and admin.

### 5.4 External API (v1)

#### `POST /api/v1/leads` — Create Lead (External Agent)

```
Auth:     Bearer token (API_TOKEN env variable)
Header:   Authorization: Bearer <token>
Request:  {
  "projectName": string,
  "customerName": string,
  "customerEmail": string,
  "projectDescription": string
}
Response: {
  "id": string,
  "projectName": string,
  "customerName": string,
  "customerEmail": string,
  "projectDescription": string,
  "source": "AGENT",
  "status": "NEW",
  "createdAt": string
} (201)
401:      { "error": "Unauthorized..." }
400:      { "error": "Validation failed", "details": string[] }
```

**Behavior:**
- Validates Bearer token against `API_TOKEN` env variable
- Validates all required fields and email format
- Creates lead with `source: AGENT`
- Creates initial StatusHistory record
- Does NOT send any email to the customer
- Full documentation: `docs/API-INTEGRATION.md`

### 5.5 Content API

#### `GET /api/content` — List All Content (Internal)

```
Auth:     Required (middleware-enforced)
Response: Content[] (sorted by createdAt DESC)
```

#### `POST /api/content` — Create Content (Internal)

```
Auth:     Required (middleware-enforced)
Request:  { title, body, mediaUrl?, mediaFile?, tags?, platforms?, status? }
Response: Content (201)
```

#### `GET /api/content/[id]` — Get Content (Internal)

```
Auth:     Required (middleware-enforced)
Response: Content (200)
404:      { "error": "Content not found" }
```

#### `PUT /api/content/[id]` — Update Content (Internal)

```
Auth:     Required (middleware-enforced)
Request:  { title?, body?, mediaUrl?, mediaFile?, tags?, platforms?, status? }
Response: Content (200)
```

#### `DELETE /api/content/[id]` — Delete Content (Internal)

```
Auth:     Required (middleware-enforced)
Response: { "success": true }
```

#### `POST /api/content/upload` — Upload Media File (Internal)

```
Auth:     Required (middleware-enforced)
Request:  multipart/form-data with "file" field
Response: { "filePath": "/uploads/filename.ext" } (201)
400:      File type not allowed or too large
```

### 5.6 Admin Users API

#### `GET /api/admin-users` — List All Admin Users

```
Auth:     Required (middleware-enforced)
Response: AdminUser[] (sorted by createdAt DESC, password excluded)
```

#### `POST /api/admin-users` — Create Admin User

```
Auth:     Required (middleware-enforced)
Request:  {
  "name": string,
  "email": string,
  "username": string,
  "password": string (min 4 chars),
  "active"?: boolean (default true)
}
Response: AdminUser (201, password excluded)
409:      { "error": "Email already in use" | "Username already taken" }
400:      { "error": "Validation failed", "details": string[] }
Side Effect: Sends welcome email to new admin's email address
```

#### `GET /api/admin-users/[id]` — Get Admin User

```
Auth:     Required (middleware-enforced)
Response: AdminUser (200, password excluded)
404:      { "error": "Admin user not found" }
```

#### `PUT /api/admin-users/[id]` — Update Admin User

```
Auth:     Required (middleware-enforced)
Request:  { "name"?, "email"?, "username"?, "password"?, "active"? }
Response: AdminUser (200, password excluded)
409:      { "error": "Email already in use" | "Username already taken" }
```

#### `DELETE /api/admin-users/[id]` — Delete Admin User

```
Auth:     Required (middleware-enforced)
Response: { "success": true }
404:      { "error": "Admin user not found" }
```

### 5.7 External Content API (v1)

All content v1 endpoints use Bearer token auth (same as leads API).

#### `GET /api/v1/content` — List Content
#### `POST /api/v1/content` — Create Content
#### `GET /api/v1/content/[id]` — Get Content
#### `PUT /api/v1/content/[id]` — Update Content
#### `DELETE /api/v1/content/[id]` — Delete Content
#### `POST /api/v1/content/upload` — Upload Media File

Full documentation: `docs/API-INTEGRATION.md` and interactive Swagger at `/api-docs`

### 5.8 SOW Templates API

#### `GET /api/sow-templates` — List All SOW Templates

```
Auth:     Required (session cookie)
Response: SowTemplate[] (sorted by isDefault DESC, createdAt DESC)
```

#### `POST /api/sow-templates` — Create SOW Template

```
Auth:     Required (session cookie)
Content-Type: multipart/form-data OR application/json
Request:  {
  "name": string,
  "description"?: string,
  "content"?: string (HTML),
  "industry"?: string,
  "projectType"?: string,
  "durationRange"?: string,
  "costRange"?: string,
  "isDefault"?: boolean,
  "file"?: File (PDF/DOCX reference document, multipart only)
}
Response: SowTemplate (201)
400:      { "error": "Validation failed", "details": string[] }
Side Effect: If isDefault=true, unsets previous default template
             File saved to public/uploads/sow-templates/
```

#### `GET /api/sow-templates/[id]` — Get SOW Template

```
Auth:     Required (session cookie)
Response: SowTemplate (200)
404:      { "error": "SOW template not found" }
```

#### `PUT /api/sow-templates/[id]` — Update SOW Template

```
Auth:     Required (session cookie)
Content-Type: multipart/form-data OR application/json
Request:  { "name"?, "description"?, "content"?, "industry"?, "projectType"?, "durationRange"?, "costRange"?, "isDefault"?, "file"?: File, "removeFile"?: "true" }
Response: SowTemplate (200)
404:      { "error": "SOW template not found" }
Side Effect: If isDefault=true, unsets other default templates
             If removeFile=true, deletes existing uploaded file
```

#### `DELETE /api/sow-templates/[id]` — Delete SOW Template

```
Auth:     Required (session cookie)
Response: { "success": true }
404:      { "error": "SOW template not found" }
```

#### SOW Generation with Template — `POST /api/leads/[id]/sow/generate`

```
Auth:     Required (session cookie)
Request:  {
  ... existing fields ...,
  "templateId"?: string  // Optional SOW template ID
}
Behavior: If templateId is provided:
          1. Fetches template content (HTML) and filePath from database
          2. If template has uploaded file (filePath), extracts content:
             - DOCX → HTML via mammoth.convertToHtml()
             - DOC → raw text via mammoth.extractRawText()
             - PDF → plain text via pdf-parse
          3. Injects into AI system prompt based on available sources:
             - Both editor content + file → both injected, editor takes precedence
             - File only → file content used as formatting blueprint
             - Editor only → editor content used as formatting blueprint
             - Neither → built-in default section structure
```

### 5.9 Response Types

```typescript
type LeadSource = "MANUAL" | "AGENT";

type LeadStatus =
  | "NEW"
  | "DESIGN_READY"
  | "DESIGN_APPROVED"
  | "BUILD_IN_PROGRESS"
  | "BUILD_READY_FOR_REVIEW"
  | "BUILD_SUBMITTED"
  | "GO_LIVE";

interface Lead {
  id: string;                  // UUID
  projectName: string;
  customerName: string;
  customerEmail: string;
  projectDescription: string;
  source: LeadSource;
  status: LeadStatus;
  emailSent: boolean;
  createdBy: string | null;    // Admin name or "API"
  updatedBy: string | null;    // Admin name
  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
  notes?: Note[];
  statusHistory?: StatusHistory[];
  nda?: Nda | null;
}

type NdaStatus = "GENERATED" | "SENT" | "SIGNED";

interface Nda {
  id: string;
  leadId: string;
  content: string;
  status: NdaStatus;
  signerName: string | null;
  signerIp: string | null;
  signedAt: string | null;
  createdAt: string;
}

interface Note {
  id: string;
  content: string;
  leadId: string;
  createdBy: string | null;
  createdAt: string;
}

interface StatusHistory {
  id: string;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  leadId: string;
  changedBy: string | null;
  createdAt: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  username: string;
  active: boolean;
  createdAt: string;
  // password is never returned in API responses
}

type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type Platform = "LINKEDIN" | "FACEBOOK" | "TIKTOK" | "INSTAGRAM";

interface Content {
  id: string;
  title: string;
  body: string;
  mediaUrl: string | null;
  mediaFile: string | null;
  tags: string[];
  platforms: Platform[];
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

interface SowTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string | null;       // HTML template content (editor)
  fileName: string | null;      // Original uploaded file name
  filePath: string | null;      // Server path to uploaded PDF/DOCX
  industry: string | null;
  projectType: string | null;
  durationRange: string | null;
  costRange: string | null;
  isDefault: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## 6. Email System

### 6.1 Configuration

| Setting | Value |
|---------|-------|
| Transport | Nodemailer with `service: "gmail"` |
| Authentication | Gmail App Password |
| TLS | Handled automatically by Nodemailer's Gmail service preset |

### 6.2 Email Flow Diagram

```
Admin clicks "Save and Inform Client"
    ↓
POST /api/leads (sendEmail: true)
    ↓
Lead created in database
    ↓
sendWelcomeEmail() called
    ↓
Nodemailer constructs HTML email
    ↓
SMTP transport sends to Gmail
    ↓
Gmail delivers to customer's inbox
    ↓
Email contains link: CUSTOMER_PORTAL_URL?id={leadId}
    ↓
emailSent flag updated to true
```

### 6.3 Status Update Email Flow

```
Admin changes lead status (with "Notify Customer" checked)
    ↓
PATCH /api/leads/[id]/status (sendEmail: true)
    ↓
Status updated + history created (transaction)
    ↓
sendStatusUpdateEmail() called
    ↓
Nodemailer constructs HTML email
    Subject: "{Project Name} — Status Update: {New Status Label}"
    ↓
SMTP transport sends to Gmail
    ↓
Gmail delivers to customer's inbox
    ↓
Email contains link: CUSTOMER_PORTAL_URL?id={leadId}
```

### 6.4 Email Template Structure

#### Welcome Email

```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐    │
│  │   Gradient Header           │    │
│  │   "Welcome, {customerName}!"│    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │   Body Card                  │    │
│  │                              │    │
│  │   "We're excited to get      │    │
│  │   started on {projectName}   │    │
│  │   with you."                 │    │
│  │                              │    │
│  │   ┌──────────────────────┐   │    │
│  │   │  View Your Project   │   │    │
│  │   │  (CTA Button)        │   │    │
│  │   └──────────────────────┘   │    │
│  └─────────────────────────────┘    │
│                                     │
│  Footer: "Reply to this email"      │
└─────────────────────────────────────┘
```

#### Status Update Email

```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐    │
│  │   Header                    │    │
│  │   "Status Update"           │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │   Body Card                  │    │
│  │                              │    │
│  │   "Hi {customerName},"      │    │
│  │   "Your project has a new    │    │
│  │   status update:"            │    │
│  │                              │    │
│  │   ┌──────────────────────┐   │    │
│  │   │  {Status Label}      │   │    │
│  │   │  (Color Badge)       │   │    │
│  │   └──────────────────────┘   │    │
│  │                              │    │
│  │   ┌──────────────────────┐   │    │
│  │   │  View Your Project   │   │    │
│  │   │  (CTA Button)        │   │    │
│  │   └──────────────────────┘   │    │
│  └─────────────────────────────┘    │
│                                     │
│  Footer: "Reply to this email"      │
└─────────────────────────────────────┘
```

---

## 7. Customer Portal Architecture

### 7.1 Rendering Strategy

The customer portal uses **Server-Side Rendering (SSR)** via Next.js Server Components.

```
Browser requests: http://localhost:3001?id={uuid}
    ↓
Next.js Server Component receives searchParams
    ↓
Server queries PostgreSQL via Prisma
    (includes notes and statusHistory)
    ↓
[Lead found]     → Renders page with:
                    - Welcome greeting
                    - Project details & current status badge
                    - Status history timeline (chronological)
                    - Admin comments/notes
[Lead not found] → Renders "Project Not Found" page
[No ID param]    → Renders "No Project ID Provided" page
    ↓
Fully rendered HTML sent to browser (no client-side fetching)
```

### 7.2 Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Lead ID guessability | UUIDs are random, not sequential |
| Data exposure | Only safe fields returned (no internal metadata) |
| No auth needed | By design — access via unique link acts as a token |

---

## 8. Docker Architecture

### 8.1 Container Topology

```
docker-compose.yml
    │
    ├── db (postgres:16-alpine)
    │   ├── Port: 5432
    │   ├── Volume: pgdata (persistent)
    │   └── Healthcheck: pg_isready
    │
    ├── admin (Dockerfile → target: admin)
    │   ├── Port: 3000
    │   ├── Depends on: db (healthy)
    │   └── Startup: runs prisma db push, then next start
    │
    └── customer (Dockerfile → target: customer)
        ├── Port: 3001
        └── Depends on: db (healthy)
```

### 8.2 Multi-Stage Dockerfile

```
Stage 1: deps          → Install npm dependencies
Stage 2: prisma        → Generate Prisma Client
Stage 3: admin-builder → Build admin Next.js app
Stage 4: customer-builder → Build customer Next.js app
Stage 5: admin         → Production admin image (slim)
Stage 6: customer      → Production customer image (slim)
```

### 8.3 Database Migration Strategy

The admin container runs `prisma db push` on startup (via `scripts/start-admin.sh`) to ensure the database schema is up to date before the app starts.

---

## 9. Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/leads_portal` |
| `SESSION_SECRET` | Cookie value for admin auth | Random string |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username (Gmail address) | `user@gmail.com` |
| `SMTP_PASS` | SMTP password (Gmail App Password) | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | Sender email address | `user@gmail.com` |
| `CUSTOMER_PORTAL_URL` | Base URL of customer portal | `http://localhost:3001` |
| `COMPANY_NAME` | Company name for NDA documents and emails | `Your Company Name` |
| `API_TOKEN` | Bearer token for external API authentication | `lp_sk_...` |
| `ADMIN_PORTAL_URL` | Admin portal URL (for welcome emails) | `http://localhost:3000` |

**Security:** The `.env` file is listed in both `.gitignore` and `.dockerignore` to prevent secrets from being committed or included in Docker images.

---

## 10. Request/Response Flow Diagrams

### 10.1 Full Lead Creation with Email

```
┌────────┐         ┌────────────┐         ┌──────────┐         ┌────────┐
│ Admin  │         │ Admin App  │         │ Database │         │ Gmail  │
│ Browser│         │ (Next.js)  │         │ (Postgres)│        │ SMTP   │
└───┬────┘         └─────┬──────┘         └────┬─────┘         └───┬────┘
    │                     │                     │                    │
    │  POST /api/leads    │                     │                    │
    │  {sendEmail: true}  │                     │                    │
    │────────────────────>│                     │                    │
    │                     │                     │                    │
    │                     │  INSERT INTO leads  │                    │
    │                     │────────────────────>│                    │
    │                     │                     │                    │
    │                     │     lead record     │                    │
    │                     │<────────────────────│                    │
    │                     │                     │                    │
    │                     │     sendMail()      │                    │
    │                     │────────────────────────────────────────>│
    │                     │                     │                    │
    │                     │     email sent      │                    │
    │                     │<────────────────────────────────────────│
    │                     │                     │                    │
    │                     │  UPDATE emailSent   │                    │
    │                     │────────────────────>│                    │
    │                     │                     │                    │
    │   201 { lead }      │                     │                    │
    │<────────────────────│                     │                    │
    │                     │                     │                    │
    │  Router.push        │                     │                    │
    │  (/dashboard)       │                     │                    │
    │                     │                     │                    │
```

### 10.2 Customer Portal Access

```
┌──────────┐         ┌──────────────┐         ┌──────────┐
│ Customer │         │ Customer App │         │ Database │
│ Browser  │         │  (Next.js)   │         │ (Postgres)│
└────┬─────┘         └──────┬───────┘         └────┬─────┘
     │                      │                      │
     │  GET /?id={uuid}     │                      │
     │─────────────────────>│                      │
     │                      │                      │
     │                      │  SELECT * FROM leads │
     │                      │  WHERE id = {uuid}   │
     │                      │─────────────────────>│
     │                      │                      │
     │                      │    lead record       │
     │                      │<─────────────────────│
     │                      │                      │
     │   Rendered HTML      │                      │
     │   (Welcome Page)     │                      │
     │<─────────────────────│                      │
     │                      │                      │
```

---

## 11. Development Workflow

### 11.1 Local Development (Without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Push schema to local PostgreSQL
npm run db:push

# 4. Start both apps in dev mode
npm run dev
# Admin: http://localhost:3000
# Customer: http://localhost:3001
```

### 11.2 Docker Development

```bash
# Start all services (PostgreSQL + both apps)
docker compose up --build

# Admin: http://localhost:3000
# Customer: http://localhost:3001
# PostgreSQL: localhost:5432
```

### 11.3 Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both apps in development mode |
| `npm run build` | Build both apps for production |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:push` | Push schema changes to the database |
| `docker compose up --build` | Build and start all Docker services |
| `docker compose down` | Stop all Docker services |
| `docker compose down -v` | Stop services and delete database volume |

---

## 12. Shared Database Package

### 12.1 Package: `@leads-portal/database`

The shared database package provides a singleton Prisma client used by both apps.

**Key file:** `packages/database/src/index.ts`

```typescript
// Singleton pattern prevents multiple Prisma instances in development
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Usage in apps:**

```typescript
import { prisma } from "@leads-portal/database";
```

Both Next.js apps include `transpilePackages: ["@leads-portal/database"]` in their `next.config.ts` to ensure the workspace package is compiled correctly.

---

## 13. Lead Assignment & Watch List

### 13.1 Schema Changes

#### Lead Model — New Field

```prisma
model Lead {
  // ... existing fields ...
  assignedToId  String?    @map("assigned_to_id")
  assignedTo    AdminUser? @relation("AssignedLeads", fields: [assignedToId], references: [id], onDelete: SetNull)
  watchers      LeadWatcher[]
}
```

- `assignedToId` is a nullable foreign key to `AdminUser`
- `onDelete: SetNull` ensures that if the assigned admin is deleted, the lead remains but becomes unassigned

#### LeadWatcher Join Table

```prisma
model LeadWatcher {
  id        String   @id @default(uuid())
  leadId    String   @map("lead_id")
  adminId   String   @map("admin_id")
  createdAt DateTime @default(now()) @map("created_at")

  lead  Lead      @relation(fields: [leadId], references: [id], onDelete: Cascade)
  admin AdminUser @relation(fields: [adminId], references: [id], onDelete: Cascade)

  @@unique([leadId, adminId])
  @@map("lead_watchers")
}
```

- Composite unique constraint on `(leadId, adminId)` prevents duplicate watches
- Cascade delete on both relations: deleting a lead or admin removes the watcher record

#### AdminUser Model — New Relations

```prisma
model AdminUser {
  // ... existing fields ...
  assignedLeads  Lead[]        @relation("AssignedLeads")
  watchedLeads   LeadWatcher[]
}
```

### 13.2 API Routes

#### Assignment

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| PUT | `/api/leads/[id]/assign` | Assign or reassign a lead to an admin | Session (admin) |

**PUT `/api/leads/[id]/assign`**

Request body:
```json
{ "adminId": "uuid-of-admin" }
```

Behavior:
1. Validates the target admin exists and is active
2. Updates `lead.assignedToId` to the new admin ID
3. If the assignee changed, sends a notification email to the newly assigned admin via `sendLeadAssignedEmail()`
4. Returns the updated lead with `assignedTo` relation included

Response: `200 { lead }` or `400/404` on error.

#### Watch List

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/leads/[id]/watch` | Get watchers for a lead | Session (admin) |
| POST | `/api/leads/[id]/watch` | Add current admin as watcher | Session (admin) |
| DELETE | `/api/leads/[id]/watch` | Remove current admin as watcher | Session (admin) |

**GET `/api/leads/[id]/watch`**

Response:
```json
{
  "watchers": [
    { "id": "watcher-uuid", "adminId": "admin-uuid", "admin": { "id": "...", "name": "..." } }
  ],
  "isWatching": true
}
```

**POST `/api/leads/[id]/watch`**

Creates a `LeadWatcher` record for the current admin. Returns `201` with the watcher list, or `409` if already watching.

**DELETE `/api/leads/[id]/watch`**

Removes the `LeadWatcher` record for the current admin. Returns `200` with the updated watcher list.

### 13.3 Modifications to Existing Routes

#### POST `/api/leads` — Auto-Assign and Auto-Watch

When a lead is created via the admin portal:
1. Set `assignedToId` to the creating admin's ID
2. Create a `LeadWatcher` record for the creating admin

API-created leads (source = AGENT) skip both steps.

#### GET `/api/leads` — Assignment Filter

New query parameter: `assignedTo`

| Value | Behavior |
|-------|----------|
| `me` | Filter to leads where `assignedToId` matches the session admin's ID (default) |
| `{adminId}` | Filter to leads assigned to a specific admin |
| `all` | No assignment filter — return all leads |

The parameter is passed through to the Prisma `where` clause. The response includes `assignedTo` relation data for display in the dashboard grid.

#### GET `/api/leads/[id]` — Include Relations

The single lead endpoint now includes:
```typescript
include: {
  // ... existing includes ...
  assignedTo: { select: { id: true, name: true, email: true } },
  watchers: { include: { admin: { select: { id: true, name: true } } } }
}
```

### 13.4 Watcher Notification System

#### Admin Side — `apps/admin/src/lib/watcher-notifications.ts`

```typescript
export async function notifyWatchers(
  leadId: string,
  excludeAdminId: string,  // admin who performed the action
  subject: string,
  htmlBody: string
): Promise<void>
```

Behavior:
1. Queries all `LeadWatcher` records for the given lead, including admin email
2. Filters out the `excludeAdminId` (the acting admin, to avoid self-notification)
3. Sends an email to each remaining watcher using Nodemailer

Called from:
- **Status change** (`POST /api/leads/[id]/status`) — after status is updated, notifies watchers with the new status
- **Note added** (`POST /api/leads/[id]/notes`) — after note is saved, notifies watchers with the note content

#### Customer Side — `apps/customer/src/lib/email.ts`

New function:
```typescript
export async function notifyLeadWatchers(
  leadId: string,
  subject: string,
  htmlBody: string
): Promise<void>
```

Behavior:
1. Queries `LeadWatcher` records for the lead via Prisma (customer app has read access to the shared database)
2. Sends an email to each watcher

Called from:
- **SOW comment** (`POST /api/sow/[sowId]/comments`) — notifies watchers when a customer comments on a SOW
- **App flow comment** (`POST /api/app-flows/[flowId]/comments`) — notifies watchers when a customer comments on an app flow

### 13.5 UI Changes

#### Dashboard (`/dashboard`)

- New "Assigned To" filter dropdown in the filter bar, alongside existing status/stage/source filters
  - Options: "My Leads" (default), each active admin by name, "All Leads"
  - Changing the filter updates the `assignedTo` query parameter and refetches leads
- New "Assigned To" column in the leads grid table, displaying the admin's name or "Unassigned"

#### Lead Detail Page (`/leads/[id]`)

- **Assignment dropdown**: positioned in the project details section
  - Shows all active admin users
  - Current assignee is pre-selected
  - Changing the selection triggers `PUT /api/leads/[id]/assign`
- **Watch/Unwatch button**: positioned near the assignment dropdown
  - Displays an eye icon with the current watcher count (e.g., "Watch (3)" or "Unwatch (3)")
  - Click toggles the watch state via `POST` or `DELETE /api/leads/[id]/watch`

### 13.6 Email Templates

#### Lead Assigned Email

| Aspect | Detail |
|--------|--------|
| Trigger | Lead is reassigned to a different admin |
| Recipient | Newly assigned admin's email |
| Subject | "Lead Assigned to You — {Project Name}" |
| Content | Greeting, project name, customer name, link to lead detail page |
| Function | `sendLeadAssignedEmail()` in `apps/admin/src/lib/email.ts` |

#### Watcher Notification Email

| Aspect | Detail |
|--------|--------|
| Trigger | Status change, note added, or customer comment on a watched lead |
| Recipient | Each watcher (except the acting admin) |
| Subject | Varies by event (e.g., "Status Update on {Project Name}", "New Note on {Project Name}", "New Comment on {Project Name}") |
| Content | Event summary, link to lead detail page |

---

## 14. Wireframe App Flow System

### 14.1 Architecture

The wireframe app flow system generates realistic mobile screen mockups using AI and renders them as interactive ReactFlow diagrams.

```
Admin selects "Wireframe" flow type
    ↓
buildAppFlowPrompt() generates system + user prompts
    ↓
Claude API (SSE streaming) returns JSON { nodes, edges }
    ↓
Nodes rendered as WireframeNode components (phone-shaped frames)
    ↓
Elements rendered via renderElement() — 17 typed UI components
```

### 14.2 WireframeNode Component

Phone-shaped ReactFlow node with:
- **Frame**: 220px wide, min-height 380px, rounded corners, shadow
- **Notch**: Centered top notch with camera dot (mimics iPhone)
- **Status bar**: Time, signal, wifi, battery indicators
- **Content area**: Renders typed UI elements in sequence
- **Home indicator**: Bottom bar (mimics iPhone gesture bar)
- **Handles**: Left (target) and Right (source) for horizontal flow connections

### 14.3 UI Element Types

Elements are JSON objects with a `type` field and type-specific properties:

| Type | Properties | Renders As |
|------|-----------|------------|
| `nav-bar` | `label` | Top bar with hamburger + title |
| `heading` | `label` | Bold large text |
| `text` | `content` | Gray paragraph text |
| `input` | `label`, `placeholder` | Label + input field |
| `button` | `label` | Filled teal button |
| `button-outline` | `label` | Outlined button |
| `image` | `label` | Gray placeholder with icon |
| `avatar` | — | Circle + name placeholder |
| `search` | `placeholder` | Search bar with icon |
| `card` | `label` | Card with image area + text |
| `list` | `items[]` | Bulleted list items |
| `tab-bar` | `items[]` | Bottom tab icons |
| `toggle` | `label` | Label + toggle switch |
| `divider` | — | Horizontal line |
| `checkbox` | `label` | Checkbox + label |
| `radio` | `label` | Radio button + label |
| `social-login` | `label` | Social login button |
| `map` | `label` | Map placeholder |

### 14.4 Layout

- **Horizontal storyboard**: Nodes positioned left-to-right (x increments by 280, y=0 for main path)
- **Branch paths**: Same x as branching point, y=500 (below main flow)
- **Edges**: smoothstep type, left-to-right connections with optional labels

### 14.5 Backward Compatibility

Old wireframe nodes with string-based elements (pre-upgrade) are rendered as plain text with a bullet point prefix.

---

## 15. SOW Template File Extraction

### 15.1 File Upload

SOW templates support optional file upload (PDF/DOCX) as reference documents:
- Files saved to `public/uploads/sow-templates/{timestamp}-{filename}`
- Template stores `fileName` (display) and `filePath` (server path)
- Multipart form data parsing with error handling for large files
- Nginx `client_max_body_size: 50M` supports large document uploads

### 15.2 Content Extraction (`extract-file-text.ts`)

```typescript
extractFileContent(filePath: string): Promise<{ text: string; format: "html" | "text" } | null>
```

| File Type | Library | Output Format | Notes |
|-----------|---------|--------------|-------|
| `.docx` | mammoth `convertToHtml()` | HTML | Preserves headings, lists, tables |
| `.doc` | mammoth `extractRawText()` | Plain text | Legacy format, text-only fallback |
| `.pdf` | pdf-parse (`require()`) | Plain text | CommonJS import for Next.js compatibility |

### 15.3 AI Prompt Integration

The `buildSowPrompt()` function handles 4 scenarios:

| Scenario | Behavior |
|----------|----------|
| Both editor template + file content | Both injected; editor template takes precedence on conflicts |
| File content only | File content used as primary formatting blueprint |
| Editor template only | Editor HTML used as formatting blueprint |
| Neither | Built-in default section structure (9 sections) |

---

## 16. Google Analytics Integration

### 16.1 Customer Portal

- **Tag ID**: G-8J4D4JHZGN
- **Implementation**: Next.js `Script` component in `apps/customer/src/app/layout.tsx`
- **Loading Strategy**: `afterInteractive` — loads after page hydration for performance
- **Scope**: All customer portal pages (tracking pageviews, user engagement)
- **Admin Portal**: No analytics (internal tool)

---

## 17. Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | March 5, 2026 | Initial document creation | — |
| 1.1 | March 6, 2026 | Added LeadStatus enum, Note & StatusHistory models, new API endpoints (single lead, status update, notes), status update email, updated customer portal architecture | — |
| 1.2 | March 6, 2026 | Added NDA feature: NdaStatus enum, Nda model, NDA generation/signing APIs, customer portal NDA UI with PDF download and e-signature, NDA email notifications | — |
| 1.3 | March 6, 2026 | Added external API integration: LeadSource enum, Bearer token auth, POST /api/v1/leads endpoint, NDA edit/send split, API documentation | — |
| 1.4 | March 7, 2026 | Added content management: Content model, CRUD API + external v1 API, file upload, Swagger/OpenAPI docs at /api-docs | — |
| 1.5 | March 7, 2026 | Added AdminUser model with bcrypt auth, session helper for audit trail, lead edit/delete APIs, audit fields (createdBy/updatedBy/changedBy), admin user CRUD API, admin welcome email, dark mode (ThemeProvider + ThemeToggle) | — |
| 1.6 | March 12, 2026 | Added SowTemplate model (name, description, HTML content, industry, projectType, durationRange, costRange, isDefault), CRUD API routes, SOW builder template selector integration, AI prompt template injection | — |
| 1.7 | March 13, 2026 | Lead assignment & watch list: assignedToId FK on Lead (to AdminUser, onDelete SetNull), LeadWatcher join table, PUT /api/leads/[id]/assign, GET/POST/DELETE /api/leads/[id]/watch, auto-assign on creation, dashboard "My Leads" default filter + "Assigned To" column, lead detail assignment dropdown + watch button, watcher notifications on status/notes/customer comments via notifyWatchers() and notifyLeadWatchers() utilities | — |
| 1.8 | March 13, 2026 | SOW template file upload (multipart form data, PDF/DOCX stored in public/uploads/sow-templates/), file content extraction (mammoth for DOCX→HTML, pdf-parse for PDF→text), AI prompt integration (4-scenario template handling), wireframe app flow upgrade (WireframeNode with phone frame, 17 typed UI element renderers, horizontal storyboard layout), Google Analytics on customer portal (G-8J4D4JHZGN via Next.js Script), Nginx upload limit increased to 50M | — |
| 2.0 | March 28, 2026 | BrandingConfig model, ZohoConfig model + zohoLeadId on Lead, zoho.ts OAuth utility (getAccessToken, createZohoLead, searchZohoLead, getZohoLeadUrl), Zoho settings page + lead management tools (Find & Link, Import, Export), Book Meeting tab (Zoho Bookings iframe), ProjectFeedback component replacing AI enhancer, customer notes API | — |
| 2.8 | March 31, 2026 | 15 new Lead fields (jobTitle, companyName, industry, companySize, companyWebsite, location, extractedDate, lastContactedDate, leadScore, outreach tracking booleans), expanded LeadSource (11 values) + LeadStage (12 values), external API v1 GET with filters + POST with all fields, reorganized new lead page (4 sections) | — |
| 3.0 | March 31, 2026 | NotificationPreference model, CustomerVisit model, notify.ts central dispatcher (sendNotification with preference checking), 9 notification events wired across admin+customer APIs, VisitTracker component, POST /api/track-visit with 30min rate limiting, bidirectional Zoho sync (getZohoLead, updateZohoLead, buildZohoFieldData helper, sync-lead API) | — |
| 3.2 | April 1, 2026 | AuditLog model + logAudit() utility wired to 16+ API routes, GET /api/leads/[id]/audit endpoint, email functions updated to return {subject, html} for SentEmail logging, POST /api/leads/[id]/welcome-email for resend, admin notes PUT/DELETE (owner-only enforcement), customer notes filtered by createdBy endsWith "(Customer)", NEXT_PUBLIC_CUSTOMER_PORTAL_URL on lead detail | — |
| 3.3 | April 2, 2026 | 4 new LeadStatus values (LOST, NO_RESPONSE, ON_HOLD, CANCELLED), doNotContact boolean on Lead (auto-set on closed statuses), email blocking in 5 API routes (compose, welcome, NDA, SOW share, App Flow share return 403), html2pdf.js for SOW PDF (replaces jsPDF plain text), base64 image conversion for cross-origin logo, img max-width in preview+PDF | — |
| 3.4 | April 2, 2026 | AdminShell layout wrapper (sidebar + breadcrumbs), Sidebar component (fixed w-56, grouped nav, theme toggle, logout), Breadcrumbs component (auto-generated from URL), root layout wraps in AdminShell, all pages: removed redundant headers/nav, full-width layouts, activity feed email opened + portal visits + pagination | — |
| 3.5 | April 3, 2026 | GET /api/dashboard endpoint (stats aggregation from leads, emails, visits, tasks, audit), dashboard page (greeting, 7 stat cards, 4 engagement cards, My Tasks, Needs Attention, Pipeline Overview, Recent Activity), assignedToId FK on NextStep (task assignment with email notification via sendNotification, reassign via PUT, audit logging), collapsible sidebar (3 states: expanded/collapsed/hover, localStorage persistence, 200ms transitions) | — |
| 3.6 | April 3, 2026 | PortfolioService model (name, description, email/phone/meeting scripts, documents JSON, urls JSON), PortfolioProject model (title, description, serviceId FK, category, domain, technologies JSON, customerName, customerDetail, demoVideoUrl, documents JSON, scripts, completedAt), CRUD API routes for both, Portfolio list page with tabs, Service detail with tabbed scripts + copy + URLs + docs + linked projects, Project detail with 2-col layout, Create/Edit forms with dynamic URL/doc/tech inputs | — |
| 3.7 | April 3, 2026 | Message model (leadId, content, senderName, senderType, readAt), ChatWidget component (floating bubble, sign-in gate, chat panel with polling), admin Messages section on lead detail (chat bubbles, reply input, doNotContact check), customer/admin message API routes with email notifications via nodemailer/sendNotification, audit logging. EmailDraft model (leadId, subject, body, cc, bcc), CRUD API /api/leads/[id]/drafts, Save/Update Draft button in compose UI, drafts list as amber cards. aboutCompany text field on Lead model + all APIs + UI | — |
| 3.8 | April 3, 2026 | NaicsSector model (code unique, name) + NaicsSubsector (code unique, name, sectorId FK), naics-data.json extracted from NAICS_2022_Codes_Reference.xlsx (20 sectors, 96 subsectors), seed API, GET /api/naics, naicsSectorCode + naicsSubsectorCode on Lead, cascading dropdowns in edit mode, badges in view mode, /naics-codes management page. KnowledgeArticle model (title, slug unique, content Markdown, category, tags), GET/POST/PUT/DELETE CRUD + seed API (12 articles), /knowledge list with search + category filters, /knowledge/[slug] with Markdown renderer + Share Link, /knowledge/new Markdown editor | — |
| 3.9 | April 3, 2026 | Customer portal: max-w-4xl → max-w-6xl, welcome section with personalized message + frosted status badge, KITLabs Resources section (5 product cards linking to kitlabs.us), branded footer with logo + copyright. Lead detail view mode: grid-cols-2 → grid-cols-3, all 21 fields always visible with "—" for empty, compact text-xs labels, full-width About Company + NAICS + Outreach sections | — |
| 4.0 | April 3, 2026 | GET /api/messages (admin: unread count + conversations grouped by lead), /messages page (unread tab + all conversations tab, 10s polling), Sidebar: "Live Chat" with unreadCount badge (15s polling), lead detail messages poll 30s→5s, ChatWidget: auto-open 10s timer, adaptive polling (5s open/15s closed), sound on new admin message (base64 wav), dashboard: unreadMessages stat, "Notifications"→"Communications", customer portal: ThemeToggle moved to nav, text-3xl→text-xl, text-lg→text-sm, text-sm→text-xs across all sections | — |
| 4.1 | April 4, 2026 | GET/POST /api/leads/[id]/sow/[sowId]/comments (admin SOW comment API with email notification to customer), updated App Flow comments POST with email notification + audit logging, lead detail: SOW/App Flow sections show comments grouped by version/flow with admin/customer styling + inline reply input, floating chat widget on admin lead detail (replaced inline Messages section, 3s/10s adaptive polling, sound, auto-open on new message), apolloUrl field on Lead model + all APIs, OpenAPI spec v4.0 (Lead schema: 30+ fields, LeadCreate: 25+ fields with all enums, GET /api/v1/leads with filters + pagination) | — |
| 4.2 | April 5, 2026 | Admin preview mode: HMAC-signed preview token (preview-token.ts in both portals), Admin Preview URL on lead detail (amber card), VisitTracker skips tracking when preview param present, track-visit API validates token server-side. Customer portal redesign: ProjectShell + ProjectSidebar components (collapsible left sidebar replacing top tabs, collapse/expand/hover/lock with localStorage, mobile hamburger overlay), card-based dashboard with SVG icons, progress stepper, Your Representative card (assigned admin photo/name/email), NdaRequestCard + NdaRequestModal (editable message + PDF/Word upload, POST /api/nda/request with audit + note + email to admin) | — |
| 4.3 | April 5, 2026 | Email unsubscribe: getUnsubscribeFooter() added to all 10 customer-facing email touchpoints (welcome, status, NDA/SOW/App Flow ready, compose, messages, comment replies, NDA/SOW signed), /unsubscribe page on customer portal (pre-filled email, doNotContact toggle), POST /api/unsubscribe (enables doNotContact on all matching leads, audit log, emails admin). ChatWidget improvements: close button moved to header corner, welcome message, bubble hidden when panel open | — |
| 4.6 | April 7, 2026 | PortfolioProject model: 6 new fields (industry, industrySector, industrySubsector, portfolioUrl, customerReviewUrl, additionalLinks JSON), NAICS cascading dropdowns for sector/subsector on project form, Demo Video URL moved from client to project section, URL copy buttons on detail page (portfolio URL, demo URL, customer review URL, additional links), CopyButton component with "Copied!" feedback | — |
| 4.5 | April 7, 2026 | Dashboard sorting: sortBy + sortOrder query params on GET /api/leads and GET /api/v1/leads (8 sortable fields + assignedTo relation sort), clickable table headers with sort direction arrows, default sort by updatedAt desc. Page size selector (20/50/100, default 50). Unassigned filter: assignedTo=unassigned in both internal and v1 APIs (where assignedToId=null). Lead detail right column reorder: email conversation thread first, audit log second, next steps third. Breadcrumb redirects for /leads→/dashboard and /portfolio/services|projects→/portfolio. Release History page + 8 new Knowledge Base articles. OpenAPI spec v4.6 with sortBy/sortOrder/unassigned params | — |
| 4.4 | April 5, 2026 | Editable system email templates: systemKey field on EmailTemplate model (unique, nullable), getSystemEmailContent() utility in both portals (loads template from DB, merges {{tags}}, falls back to hardcoded HTML), 10 system templates seeded (system_welcome, system_status_update, system_nda_ready, system_sow_ready, system_app_flow_ready, system_sow_comment_reply, system_app_flow_comment_reply, system_admin_message, system_nda_signed, system_sow_signed), admin UI: Compose/System tabs on /email-templates page, system template card grid with merge tag chips, edit page with purple info banner + clickable merge tags, system templates cannot be deleted (API 403 + hidden button), GET /api/email-templates?type=system|compose filter | — |
