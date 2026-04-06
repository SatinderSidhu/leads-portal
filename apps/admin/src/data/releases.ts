export interface Release {
  version: string;
  date: string;
  commitId: string;
  changes: string[];
}

export const releases: Release[] = [
  {
    version: "4.4",
    date: "2026-04-05",
    commitId: "9a82eeb",
    changes: [
      "Editable system email templates — 10 system-triggered emails now stored as customizable templates in DB",
      "Admin can edit subject/body of system emails via RichTextEditor with merge tag support",
      "Email Templates page: Compose Templates / System Templates tabs",
      "System templates shown as card grid with merge tag chips (click to copy)",
      "System templates cannot be deleted (API protection + hidden delete button)",
      "getSystemEmailContent() utility loads template from DB with fallback to hardcoded defaults",
    ],
  },
  {
    version: "4.3",
    date: "2026-04-05",
    commitId: "59d81a3",
    changes: [
      "Email unsubscribe link added to all customer-facing emails (10 touchpoints)",
      "New /unsubscribe page on customer portal with pre-filled email",
      "Unsubscribe enables Do Not Contact on all matching leads, logs audit, emails admin",
      "Chat widget: close button moved to header corner, welcome message added, bubble hidden when panel open",
      "Your Representative card on customer portal showing assigned admin photo/name/email",
    ],
  },
  {
    version: "4.2",
    date: "2026-04-05",
    commitId: "48a20af",
    changes: [
      "Customer portal redesign: left sidebar navigation replacing top tabs",
      "Sidebar: collapse/expand, hover-expand, pin/lock, localStorage persistence",
      "Mobile: hamburger menu + overlay sidebar",
      "Dashboard cards: NDA, SOW, App Flow, Book Meeting (always visible, grayed if unavailable)",
      "NDA Request flow: customer can request NDA with editable message + file upload",
      "Admin preview mode: signed token URL for visiting customer portal without triggering notifications",
      "Project description moved first in overview, progress stepper removed",
    ],
  },
  {
    version: "4.1",
    date: "2026-04-04",
    commitId: "eb0c4f1",
    changes: [
      "Admin comment replies on SOW and App Flow sections with email notifications",
      "Floating chat widget on admin lead detail (replaces inline Messages section)",
      "Apollo URL field on leads",
      "Auto-populate NAICS codes from Apollo data or industry text matching",
      "7 new Knowledge Base articles for recent features",
      "OpenAPI spec v4.0 with all new fields and endpoints",
    ],
  },
  {
    version: "4.0",
    date: "2026-04-03",
    commitId: "d22211c",
    changes: [
      "Live Chat: admin sidebar unread badge (polls 15s), dedicated /messages page with unread/all tabs",
      "Fast polling (5s) for live chat feel, customer chat auto-opens after 10s with sound notifications",
      "Unread Chats dashboard stat card",
      "Professional font sizing across customer portal",
    ],
  },
  {
    version: "3.9",
    date: "2026-04-03",
    commitId: "43f25d5",
    changes: [
      "Customer portal redesign: wider layout (max-w-6xl), warm welcome message",
      "KITLabs Resources section with 5 product cards + quick links",
      "Branded footer with logo and copyright",
      "Compact lead detail view: 3-column grid showing all 21 fields",
    ],
  },
  {
    version: "3.8",
    date: "2026-04-03",
    commitId: "e600de0",
    changes: [
      "NAICS 2022 industry classification (20 sectors, 96 subsectors)",
      "Cascading NAICS dropdowns on lead detail page",
      "Knowledge Base with 12 default articles, Markdown rendering, search, categories",
      "Shareable article URLs via slug",
    ],
  },
  {
    version: "3.7",
    date: "2026-04-03",
    commitId: "45c7d62",
    changes: [
      "Secure messaging between admin and customer portals (Message model, ChatWidget)",
      "Email drafts: save/update/load/delete multiple drafts per lead",
      "About Company text field on leads",
    ],
  },
  {
    version: "3.6",
    date: "2026-04-03",
    commitId: "f5458f2",
    changes: [
      "Portfolio system: services and projects with pitch scripts",
      "Service detail with email/phone/meeting scripts, URLs, documents",
      "Project detail with technologies, client info, demo video",
    ],
  },
  {
    version: "3.5",
    date: "2026-04-03",
    commitId: "5bbf438",
    changes: [
      "Interactive dashboard: stats, needs attention, my tasks, pipeline overview",
      "Task assignment on Next Steps (assignedToId, email notification)",
      "Collapsible sidebar with hover-expand and lock toggle",
    ],
  },
  {
    version: "3.4",
    date: "2026-04-02",
    commitId: "76e9e97",
    changes: [
      "Persistent sidebar navigation (AdminShell + Sidebar + Breadcrumbs)",
      "Full-width page layouts, removed per-page headers",
    ],
  },
  {
    version: "3.3",
    date: "2026-04-02",
    commitId: "40961b3",
    changes: [
      "Closed statuses: Lost, No Response, On Hold, Cancelled",
      "Do Not Contact flag (auto-enabled on closed statuses, blocks all outbound emails)",
      "SOW PDF fix: html2pdf.js with HTML formatting + base64 images",
    ],
  },
  {
    version: "3.2",
    date: "2026-04-01",
    commitId: "a51135f",
    changes: [
      "AuditLog model with 16+ event types across admin and customer portals",
      "Activity feed with email opened + portal visits + pagination",
      "Email history logging for welcome/NDA/SOW/App Flow emails",
      "Resend welcome email, admin notes edit/delete",
    ],
  },
  {
    version: "3.0",
    date: "2026-03-31",
    commitId: "cba5bd2",
    changes: [
      "Configurable notification system (9 event types, per-admin preferences)",
      "Customer portal visit tracking with rate-limited notifications",
      "Central notification dispatcher (notify.ts)",
    ],
  },
  {
    version: "2.9",
    date: "2026-03-31",
    commitId: "508606a",
    changes: [
      "Bidirectional Zoho CRM sync with timestamp comparison",
      "Find & Link unlinked leads tool",
      "Import from Zoho and Export to Zoho bulk tools",
    ],
  },
  {
    version: "2.8",
    date: "2026-03-31",
    commitId: "fe0da73",
    changes: [
      "15 new lead fields (jobTitle, companyName, industry, outreach tracking, etc.)",
      "Expanded LeadSource (11 values) and LeadStage (12 values)",
      "External API v1 GET with filters + POST with all fields",
    ],
  },
  {
    version: "2.7",
    date: "2026-03-28",
    commitId: "1f890db",
    changes: [
      "Zoho CRM integration (OAuth setup, create/search leads)",
      "Book Meeting tab with Zoho Bookings iframe",
      "Customer feedback comments replacing AI enhancer",
      "Branding system for dynamic company branding",
    ],
  },
  {
    version: "2.5",
    date: "2026-03-28",
    commitId: "434b93e",
    changes: [
      "SOW comments, signing, and PDF download on customer portal",
      "App flow comments fix + email notifications",
      "Full-screen views + PNG/PDF download for app flows",
    ],
  },
  {
    version: "2.4",
    date: "2026-03-28",
    commitId: "bac4276",
    changes: [
      "App flow planner with AI generation (Basic + Wireframe types)",
      "ReactFlow canvas editor with drag-and-drop",
      "Customer portal read-only flow viewer",
      "KITLabs branding update across both portals",
    ],
  },
  {
    version: "2.3",
    date: "2026-03-28",
    commitId: "444c10b",
    changes: [
      "AI-powered SOW builder with Claude streaming",
      "DOCX/PDF export for generated SOWs",
      "Customer portal SOW rendering",
    ],
  },
  {
    version: "2.0",
    date: "2026-03-13",
    commitId: "76829b6",
    changes: [
      "AWS deployment: Docker, CI/CD pipeline, SSL certificates",
      "Nginx reverse proxy for admin + customer portals",
    ],
  },
  {
    version: "1.9",
    date: "2026-03-12",
    commitId: "0a24c2f",
    changes: [
      "Lead fields: phone, city, zip, dateCreated",
      "File attachments on leads",
      "Rich text editor upgrades and email preview",
    ],
  },
  {
    version: "1.8",
    date: "2026-03-12",
    commitId: "aceaac5",
    changes: [
      "Admin profile page with picture upload and email signature",
      "SOW template file upload with content extraction",
      "Wireframe app flow with 17 typed UI elements",
    ],
  },
  {
    version: "1.5",
    date: "2026-03-07",
    commitId: "00edfd6",
    changes: [
      "Multi-admin auth with bcrypt, lead edit/delete, audit trail, dark mode",
    ],
  },
  {
    version: "1.0",
    date: "2026-03-05",
    commitId: "a741ede",
    changes: [
      "Initial release: admin portal + customer portal",
      "Lead management, email compose, NDA generation",
      "PostgreSQL + Prisma, Next.js App Router, Tailwind CSS",
    ],
  },
];
