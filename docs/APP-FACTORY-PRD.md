# App Factory — Product Requirements Document

## KITLabs Leads Portal

| Field | Detail |
|-------|--------|
| Document Version | 1.0 — Draft |
| Date | April 10, 2026 |
| Product Owner | Satinder — KITLabs |
| Status | Architecture & skeleton planning |

---

## 1. Executive Summary

App Factory is a **public-facing interactive microsite** where customers go from "I have an app idea" to "my app is live in the App Store" — guided step-by-step through requirements gathering, visual prototyping, build submission, app store configuration, and iterative enhancement.

It replaces the current manual workflow where a customer describes their idea in a call, KITLabs builds a SOW and app flow separately, and the customer has no visibility into the build process. App Factory collapses this into a single self-service experience that:

1. **Captures the idea** — customer types their concept, AI generates a high-level flow + screen mockups interactively
2. **Refines requirements** — back-and-forth with the customer to finalize screens, features, and user journeys
3. **Submits for build** — one click to send the finalized requirements to the KITLabs build pipeline
4. **Configures app stores** — collects iOS App Store + Google Play credentials, verifies connections
5. **Enables enhancements** — after initial build, customer can request changes and re-submit

### Relationship to Existing Portals

```
┌──────────────────────────────────────────────────────────────────┐
│                        KITLabs Platform                          │
│                                                                  │
│  ┌─────────────┐   ┌──────────────┐   ┌───────────────────┐    │
│  │ Admin Portal │   │ Customer     │   │ App Factory        │    │
│  │ (internal)   │   │ Portal       │   │ (public microsite) │    │
│  │ port 3000    │   │ port 3001    │   │ port 3002          │    │
│  │              │   │              │   │                     │    │
│  │ Lead mgmt    │   │ Project view │   │ Idea → Flow → Build│    │
│  │ SOW/NDA      │   │ SOW signing  │   │ App Store config   │    │
│  │ Sequences    │   │ App flows    │   │ Enhancements       │    │
│  │ Lists        │   │ Chat         │   │ AI-powered         │    │
│  └──────┬───────┘   └──────┬───────┘   └──────┬──────────────┘    │
│         │                  │                   │                  │
│         └──────────────────┴───────────────────┘                  │
│                     Shared Database (PostgreSQL)                  │
└──────────────────────────────────────────────────────────────────┘
```

- **Public** — no KITLabs account required to start (captures lead info during the flow)
- **Linkable from leads** — admin can send an App Factory invitation link to a lead, pre-filling their info
- **Feeds back into admin portal** — submitted builds appear as leads with full requirements + app flows attached

---

## 2. The Customer Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   1. IDEATE          2. DESIGN           3. BUILD         4. ENHANCE   │
│   ─────────          ──────────          ─────────        ──────────   │
│   "I have an idea"   "Here's what       "Build it"       "Change this" │
│                       it looks like"                                    │
│   ┌─────────┐       ┌──────────┐       ┌─────────┐     ┌──────────┐  │
│   │ Describe │──────→│ AI Flow  │──────→│ Submit  │────→│ Request  │  │
│   │ your app │       │ Builder  │       │ for     │     │ changes  │  │
│   │ idea     │       │          │       │ build   │     │          │  │
│   │          │       │ Iterate  │       │         │     │ Re-submit│  │
│   │          │       │ refine   │       │ App     │     │          │  │
│   │          │       │ finalize │       │ Store   │     │          │  │
│   └─────────┘       └──────────┘       │ config  │     └──────────┘  │
│                                         └─────────┘                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Ideate
- Customer lands on App Factory (public URL or invitation link from admin)
- Types their app idea in a conversational interface
- AI asks clarifying questions (target platform, audience, key features)
- AI generates a **high-level app flow** (screen-by-screen) + **wireframe mockups**
- Customer can iterate: "add a payment screen", "remove the social login", "make the dashboard simpler"
- This reuses the existing `AppFlow` + wireframe node system from the admin portal

### Phase 2: Design
- Customer reviews the generated flow + screens
- Can click any screen to edit, add notes, or request changes
- AI refines based on feedback (conversational back-and-forth)
- Customer finalizes and "locks" the design
- A requirements summary is generated (plain-language, printable)

### Phase 3: Build
- Customer clicks "Build My App"
- Collects contact info if not already captured (name, email, company)
- Creates/links a **Lead** in the admin portal with all requirements + app flow attached
- Customer is prompted to configure app store details:
  - **iOS**: Apple Developer Account ID, Bundle ID, App Store Connect API key
  - **Android**: Google Play Console developer account, package name, service account key
- Connection verification for both stores
- Build status visible to customer: Submitted → In Review → Building → Testing → Ready

### Phase 4: Enhance
- After the initial build is delivered, customer can return
- View current app state (screens, features)
- Request enhancements: "add push notifications", "change the color scheme"
- AI generates updated flow showing the changes
- Customer reviews and re-submits for build
- Version history maintained

---

## 3. Technical Architecture

### 3.1 App Structure

App Factory is a **third Next.js app** in the existing Turborepo monorepo:

```
leads-portal/
├── apps/
│   ├── admin/        # port 3000 (existing)
│   ├── customer/     # port 3001 (existing)
│   └── app-factory/  # port 3002 (NEW)
│       ├── src/
│       │   ├── app/          # Next.js App Router pages
│       │   ├── components/   # UI components
│       │   └── lib/          # Utilities
│       ├── public/
│       └── next.config.ts
├── packages/
│   └── database/     # Shared Prisma (existing — App Factory uses same DB)
```

**Why a separate app (not a section of customer portal):**
- Different auth model (public, no account required to start)
- Different UX paradigm (wizard/conversational vs dashboard)
- Independent deployment lifecycle (can ship App Factory updates without touching portals)
- Different performance profile (heavy AI streaming, large canvas renders)
- Clean URL: `appfactory.kitlabs.us` (or similar)

**Shared infrastructure:**
- Same PostgreSQL database via `@leads-portal/database`
- Same Prisma schema (new models added for App Factory)
- Same Anthropic Claude API for AI generation
- Same SMTP for notifications

### 3.2 New Database Models

```
AppFactoryProject
  id, publicId (short shareable slug), status (IDEATING/DESIGNING/SUBMITTED/BUILDING/DELIVERED/ENHANCING)
  customerName, customerEmail, companyName (captured during flow)
  leadId (FK to Lead, nullable — linked when submitted or via invitation)
  invitationToken (for admin-generated invitation links)
  idea (original text input)
  platforms (JSON: ["ios", "android", "web"])
  targetAudience, keyFeatures (JSON)
  createdAt, updatedAt

AppFactoryFlow
  id, projectId (FK)
  version (Int, auto-increment per project)
  flowType (BASIC/WIREFRAME — reuses existing enum)
  nodes (JSON), edges (JSON) — same format as AppFlow
  isFinalized (Boolean)
  aiConversationHistory (JSON — chat turns for context)
  createdAt

AppFactoryBuild
  id, projectId (FK)
  version (Int)
  status (SUBMITTED/IN_REVIEW/BUILDING/TESTING/READY/DELIVERED)
  requirements (JSON — structured requirements summary)
  submittedAt, deliveredAt
  notes (Text — admin notes on build progress)

AppStoreConfig
  id, projectId (FK)
  platform (IOS/ANDROID)
  accountId (encrypted)
  bundleId / packageName
  apiKeyOrServiceAccount (encrypted)
  connectionVerified (Boolean)
  connectionVerifiedAt
  createdAt, updatedAt

AppFactoryEnhancement
  id, projectId (FK), buildId (FK to AppFactoryBuild)
  description (Text — what the customer wants changed)
  aiGeneratedDiff (JSON — before/after screen changes)
  status (REQUESTED/REVIEWED/APPROVED/BUILDING/DELIVERED)
  createdAt
```

### 3.3 Pages / Routes

```
/                           Landing page — "Turn your app idea into reality"
/start                      Step 1: Type your idea (conversational AI interface)
/project/[publicId]         Project dashboard (after idea is captured)
/project/[publicId]/design  Step 2: Interactive flow builder + AI refinement
/project/[publicId]/build   Step 3: Submit for build + app store configuration
/project/[publicId]/enhance Step 4: Request enhancements + re-submit
/project/[publicId]/status  Build progress tracker
/invite/[token]             Invitation landing (pre-fills customer info from lead)
```

### 3.4 API Routes

```
POST   /api/projects                    Create project from idea
GET    /api/projects/[publicId]         Get project details
PUT    /api/projects/[publicId]         Update project info

POST   /api/projects/[publicId]/generate-flow    AI flow generation (SSE streaming)
GET    /api/projects/[publicId]/flows             List flow versions
POST   /api/projects/[publicId]/flows             Save flow version
PUT    /api/projects/[publicId]/flows/[id]        Update flow
POST   /api/projects/[publicId]/finalize          Lock design

POST   /api/projects/[publicId]/submit-build      Submit for build (creates Lead if needed)
GET    /api/projects/[publicId]/builds             List builds
GET    /api/projects/[publicId]/builds/[id]        Build status

POST   /api/projects/[publicId]/app-store          Save app store config
PUT    /api/projects/[publicId]/app-store/[id]     Update app store config
POST   /api/projects/[publicId]/app-store/[id]/verify   Verify connection

POST   /api/projects/[publicId]/enhancements       Request enhancement
GET    /api/projects/[publicId]/enhancements        List enhancements
POST   /api/projects/[publicId]/enhancements/[id]/submit   Submit enhancement for build

GET    /api/invitations/[token]         Validate invitation + pre-fill info
```

### 3.5 AI Integration

Reuses the existing Anthropic Claude API pattern from the SOW builder and App Flow builder:

- **Idea capture:** Conversational AI that asks structured questions (similar to `buildAppFlowPrompt()`)
- **Flow generation:** SSE streaming JSON generation (same as `/api/leads/[id]/app-flows/generate`)
- **Refinement:** Takes the current flow + customer's change request, generates an updated flow
- **Requirements summary:** Generates a plain-language document from the finalized flow

The existing `BasicNode` and `WireframeNode` React components can be shared (via a `packages/ui` shared package or direct import from the admin app).

### 3.6 Admin Portal Integration

When a customer submits an App Factory project for build:

1. A **Lead** is created (or linked if invitation-based) with:
   - `source: APP_FACTORY`
   - `projectDescription` populated from the AI-generated requirements
   - `status: NEW`
2. An **AppFlow** is copied from the `AppFactoryFlow` to the lead's app flows
3. The admin sees the project in the leads dashboard with full context
4. Build status updates from the admin are reflected back to the customer's App Factory view

### 3.7 Deployment

```
docker-compose.prod.yml:
  app-factory:
    image: ${ECR_REGISTRY}/leads-portal-app-factory:${IMAGE_TAG}
    restart: unless-stopped
    ports:
      - "3002:3002"
    environment:
      DATABASE_URL: (same as admin/customer)
      ANTHROPIC_API_KEY: (same)
      SESSION_SECRET: (same)
      ...
    depends_on:
      db: { condition: service_healthy }

nginx:
  # New server block: appfactory.kitlabs.us → localhost:3002
```

Dockerfile gets a third build target (`app-factory-builder` + `app-factory`), same pattern as admin and customer.

CI/CD pipeline (`deploy.yml`) adds a third image build + push + pull.

---

## 4. Implementation Plan — Skeleton First

### Sprint 1: Skeleton (this session)

Build the empty shell so the third app boots, routes work, and the DB models exist:

1. **Create `apps/app-factory/`** — Next.js 16 app with same config as admin/customer
2. **Add new Prisma models** — AppFactoryProject, AppFactoryFlow, AppFactoryBuild, AppStoreConfig, AppFactoryEnhancement
3. **Add `APP_FACTORY` to LeadSource enum**
4. **Create skeleton pages** — landing, /start, /project/[publicId] with sub-routes (design, build, enhance, status)
5. **Create skeleton API routes** — all endpoints returning placeholder responses
6. **Add to Dockerfile** — third build target
7. **Add to docker-compose.prod.yml** — third service on port 3002
8. **Add to CI/CD** — build + push third image
9. **Update sidebar** — admin portal gets an "App Factory" link to the microsite

### Sprint 2: Ideate (next session)
- Conversational AI idea capture
- Flow generation from idea (SSE streaming)
- Interactive flow canvas (read/write, reusing WireframeNode)

### Sprint 3: Design
- AI-powered refinement chat
- Screen-level editing
- Requirements summary generation
- Finalize/lock design

### Sprint 4: Build
- Submit for build flow
- Lead creation / linking
- App store configuration forms
- Connection verification
- Build status tracker

### Sprint 5: Enhance
- Enhancement request flow
- AI diff generation
- Re-submit for build
- Version history

### Sprint 6: Polish
- Invitation links from admin portal
- Email notifications (build status updates)
- Mobile-responsive design
- Analytics / tracking
- Documentation

---

## 5. Key Design Decisions

### Authentication
- **No login required to start** — friction-free idea capture
- **Email captured during the flow** — becomes the project's identity
- **Session cookie** for returning visitors (same pattern as customer portal)
- **Invitation links** carry an HMAC token that pre-fills customer info and links to a lead

### Data Ownership
- App Factory projects are **independent** from leads until explicitly linked (on build submission)
- A project can exist without a lead (casual exploration)
- A lead can have multiple App Factory projects (iterations on different ideas)
- Once linked, the admin sees everything in the lead detail page

### AI Conversation State
- Conversation history stored as JSON in `AppFactoryFlow.aiConversationHistory`
- Each refinement request sends the full history + current flow + new instruction to Claude
- Context window management: summarize old turns when history exceeds ~50k tokens

### Branding
- App Factory uses KITLabs branding but with its own design language (more consumer-facing, less CRM)
- Primary color: the existing `#01358d` deep blue
- Accent: a more vibrant gradient than the admin portal
- Logo: same `kitlabs-logo.jpg`

---

## 6. What's NOT in Scope for v1

- **Actual automated app building** — "submit for build" creates a lead with requirements; KITLabs builds manually
- **Real-time collaboration** — single-user editing only (no multiplayer canvas)
- **Payment / billing integration** — pricing is handled outside the system
- **Custom domains** — always `appfactory.kitlabs.us`
- **White-labeling** — KITLabs branding only
- **Offline / PWA** — online-only
- **API access** — no public API for App Factory (internal only)
