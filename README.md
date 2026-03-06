# Leads Portal

A lead management system for mobile app and web platform development projects. Two separate web portals — **Admin** and **Customer** — connected to a shared PostgreSQL database.

## What It Does

- **Admin Portal** — Secure internal portal for managing leads. Create new leads with project details, view all leads in a dashboard grid, and optionally send a welcome email to clients with a link to their project portal.
- **Customer Portal** — Public-facing portal where customers view their project details via a unique link received in their welcome email.

## Quick Start

### With Docker (recommended)

```bash
docker compose up --build
```

- Admin Portal: http://localhost:3000 (login: `admin` / `admin`)
- Customer Portal: http://localhost:3001

### Without Docker

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push schema to PostgreSQL (must be running locally)
npm run db:push

# Start both apps
npm run dev
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Styling | Tailwind CSS |
| Email | Nodemailer (Gmail SMTP) |
| Monorepo | Turborepo + npm workspaces |
| Containers | Docker + Docker Compose |

## Project Structure

```
leads-portal/
├── apps/
│   ├── admin/          # Admin Portal (port 3000)
│   └── customer/       # Customer Portal (port 3001)
├── packages/
│   └── database/       # Shared Prisma schema & client
├── docs/               # Documentation
├── docker-compose.yml
└── Dockerfile
```

## Documentation

- [Business Requirements Document (BRD)](docs/BRD.md) — Features, business flows, data requirements, and planned enhancements
- [Technical Requirements Document (TRD)](docs/TRD.md) — Architecture, database design, API specs, auth flow, Docker setup, and sequence diagrams

## Environment Variables

Copy `.env.example` and update with your values:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leads_portal
SESSION_SECRET=<random-secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-gmail>
SMTP_PASS=<gmail-app-password>
SMTP_FROM=<your-gmail>
CUSTOMER_PORTAL_URL=http://localhost:3001
```
