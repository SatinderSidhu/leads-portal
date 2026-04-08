import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";

const ARTICLES = [
  // Getting Started
  { category: "Getting Started", sortOrder: 1, title: "Welcome to Leads Portal", slug: "welcome", content: `# Welcome to Leads Portal

Leads Portal is KITLabs Inc's internal CRM system for managing leads, communicating with customers, and tracking project progress.

## Key Features

- **Lead Management**: Create, track, and manage leads through the entire sales pipeline
- **Email System**: Compose, send, and track emails to customers with templates
- **SOW Builder**: Generate professional Scope of Work documents using AI
- **App Flow Builder**: Create visual app flow diagrams for customer presentations
- **Customer Portal**: Customers can view their project status, review SOWs, sign NDAs, and book meetings
- **Zoho CRM Integration**: Sync leads bidirectionally with Zoho CRM
- **Portfolio**: Access pitch scripts and project references for sales calls

## Navigation

Use the **sidebar** on the left to navigate between sections. The sidebar can be collapsed by clicking the arrow icon next to the logo. Hover over a collapsed sidebar to temporarily expand it.

## Need Help?

Check the other articles in this Knowledge Base or contact the admin team.` },

  { category: "Getting Started", sortOrder: 2, title: "Dashboard Overview", slug: "dashboard-overview", content: `# Dashboard Overview

The Dashboard is your home screen showing a real-time snapshot of your lead pipeline.

## Stats Cards
- **Total Leads**: All leads in the system
- **My Leads**: Leads assigned to you
- **New Today / This Week**: Recently created leads
- **Active Pipeline**: Leads in active project stages
- **My Tasks**: Pending tasks assigned to you
- **Needs Attention**: Leads with recent customer engagement

## Customer Engagement (24h)
Shows the last 24 hours of customer activity:
- Emails opened by customers
- Customer portal visits
- Customer comments
- Email replies received

## My Tasks
Your pending tasks across all leads. Overdue tasks are highlighted in red. Click any task to go to the lead.

## Needs Attention
Leads where customers have been active recently (opened emails, visited portal, left comments, signed documents). These are hot leads that should be followed up on.

## Pipeline Overview
Visual breakdown of leads by status — helps identify bottlenecks in the pipeline.` },

  // Lead Management
  { category: "Lead Management", sortOrder: 1, title: "Creating a New Lead", slug: "creating-lead", content: `# Creating a New Lead

## Steps
1. Click **"+ New Lead"** in the sidebar (or the coral button at the top)
2. Fill in the form sections:

### Contact Information
- **Customer Name** (required)
- **Customer Email** (required)
- **Job Title**, **Phone**, **LinkedIn URL**, **Location**

### Company Information
- **Company Name**, **Industry**, **Company Size**, **Company Website**

### Project Details
- **Project Name** (required)
- **Project Description** (required)

### Lead Classification
- **Lead Source**: Where the lead came from (Manual, LinkedIn, Apollo, Referral, etc.)
- **Lead Stage**: Current sales stage (New, Contacted, Responded, Meeting Booked, etc.)
- **Lead Score**: 1-100 rating
- **City**, **Zip Code**, **Date Created**

## Zoho CRM
If Zoho integration is enabled, you'll see an **"Also create in Zoho CRM"** checkbox (checked by default). This creates the lead in Zoho simultaneously.

## After Creation
- The lead is auto-assigned to you
- You're auto-added as a watcher (you'll get notifications)
- You can optionally send a welcome email to the customer` },

  { category: "Lead Management", sortOrder: 2, title: "Lead Detail Page", slug: "lead-detail", content: `# Lead Detail Page

The lead detail page is the main workspace for managing a lead. It uses a 2-column layout.

## Left Column
- **Project Details**: Customer info, company info, Zoho status, customer portal URL
- **Email Compose**: Send emails to the customer
- **Email Thread**: Full conversation history
- **Files**: Attach documents
- **SOW**: Upload or build Scope of Work
- **App Flows**: Create and share app flow diagrams

## Right Column
- **Tasks**: Create and assign tasks with due dates
- **Status Update**: Change lead status, notify customer
- **Status History**: Timeline of status changes
- **NDA**: Generate and send Non-Disclosure Agreements
- **Admin Notes**: Internal notes (not visible to customers)
- **Audit Log**: Complete activity history

## Key Actions
- **Edit**: Click "Edit" to update lead information
- **Watch/Unwatch**: Subscribe to notifications for this lead
- **Assign**: Reassign the lead to another admin
- **Delete**: Permanently remove the lead

## Customer Portal URL
The portal URL is displayed in the left column. Click to preview what the customer sees, or copy it to share.` },

  { category: "Lead Management", sortOrder: 3, title: "Lead Statuses & Do Not Contact", slug: "lead-statuses", content: `# Lead Statuses & Do Not Contact

## Active Pipeline Statuses
| Status | Meaning |
|--------|---------|
| New | Just created, no action taken |
| SOW Ready | Scope of Work has been shared |
| SOW Signed | Customer signed the SOW |
| App Flow Ready | App flow diagram shared |
| Design Ready | Design phase complete |
| Design Approved | Customer approved designs |
| Build In Progress | Development underway |
| Build Ready for Review | Build ready for customer review |
| Build Submitted | Final build submitted |
| Go Live | Project launched |

## Closed Statuses
| Status | Meaning |
|--------|---------|
| Lost | Customer went with another vendor |
| No Response | Customer stopped responding |
| On Hold | Project paused, may resume later |
| Cancelled | Customer cancelled the project |

## Do Not Contact
When a lead is set to a closed status (Lost, No Response, On Hold, Cancelled), the **Do Not Contact** flag is automatically enabled. This:
- Blocks all outbound emails (compose, welcome, NDA, SOW share, App Flow share)
- Disables the "Notify Customer" checkbox
- Shows a red banner on the lead detail page

To re-enable communication, click **"Disable"** on the Do Not Contact banner.` },

  // Email System
  { category: "Email System", sortOrder: 1, title: "Sending Emails to Customers", slug: "sending-emails", content: `# Sending Emails to Customers

## Compose an Email
1. Open the lead detail page
2. Click **"Compose Email"** in the left column
3. Fill in:
   - **Subject**: The email subject line
   - **Body**: Use the rich text editor (bold, italic, lists, links, images)
   - **Template**: Optionally select an email template to pre-fill
   - **CC/BCC**: Add additional recipients
   - **Attachments**: Attach files
   - **Include Signature**: Check to append your email signature
4. Click **"Send"**

## Email Templates
Go to **Email Templates** in the sidebar to create reusable compose templates. Only **compose templates** (user-created) appear in the template selector when composing emails — system templates are managed separately.

Templates support merge tags:
- \`{{customerName}}\`, \`{{projectName}}\`, \`{{phone}}\`, \`{{city}}\`, \`{{status}}\`, \`{{stage}}\`, \`{{source}}\`, \`{{dateCreated}}\`

## Email Tracking
- **Open tracking**: A tracking pixel is embedded in each email. When the customer opens it, you'll see "OPENED" status.
- **Email history**: All emails (composed, welcome, NDA, SOW, App Flow) appear in the conversation thread.

## Welcome Email
- Sent automatically when creating a lead (if "Save and Inform Client" is clicked)
- Can be resent anytime via the "Send Now" / "Resend" button next to "Welcome Email" status` },

  // SOW
  { category: "SOW & Documents", sortOrder: 1, title: "Creating a Scope of Work", slug: "creating-sow", content: `# Creating a Scope of Work (SOW)

## Using the AI SOW Builder
1. On the lead detail page, click **"Build with AI"** in the SOW section
2. Fill in the left panel:
   - Select a **SOW Template** (or use default)
   - **Project Description** (auto-filled from lead)
   - **Project Type**, **Timeline**, **Budget Range**
   - **Tech Stack**, **Key Deliverables**, **Additional Notes**
3. Click **"Generate with AI"** — the AI will stream the SOW in real-time
4. Edit the result in the rich text editor if needed
5. Click **"Save as Final"** to save, or **"Save Draft"** for later

## Sharing with Customer
1. On the lead detail page, find the SOW in the right column
2. Click **"Share"** — this sends an email to the customer with a portal link
3. The customer can view, comment, and sign the SOW on their portal

## PDF Download
Click **"Download PDF"** on the SOW builder page. The PDF preserves all formatting including the company logo.

## Uploading a SOW File
Instead of using the AI builder, you can upload a PDF or Word document directly.` },

  // App Flows
  { category: "SOW & Documents", sortOrder: 2, title: "Creating App Flows", slug: "creating-app-flows", content: `# Creating App Flows

## What are App Flows?
Visual diagrams showing the user journey through an application. Two types:
- **Basic**: Flowchart-style boxes with labels and descriptions
- **Wireframe**: Realistic mobile screen mockups with UI elements

## Creating a Flow
1. On the lead detail page, click **"Create App Flow"**
2. Choose the flow type (Basic or Wireframe)
3. Use the AI to generate the initial flow, or build manually
4. Edit nodes and connections on the canvas
5. Click **"Save"**

## Sharing with Customer
Click **"Share"** on the flow — the customer can view it read-only on their portal and leave comments.

## Exporting
- **PNG**: Export the flow as an image
- **PDF**: Export as a PDF document` },

  // NDA
  { category: "SOW & Documents", sortOrder: 3, title: "NDA Management", slug: "nda-management", content: `# NDA Management

## Generating an NDA
1. On the lead detail page, find the NDA section (right column)
2. Click **"Generate NDA"** — creates the NDA from a template
3. Click **"Send to Customer"** — emails the customer with a portal link

## Customer Signing
The customer can:
1. Review the NDA on their portal
2. Download a PDF copy
3. Sign electronically (enters their name)
4. Both admin and customer receive confirmation emails

## NDA Statuses
- **Generated**: NDA created but not sent
- **Sent**: Email sent to customer
- **Signed**: Customer has signed` },

  // Zoho CRM
  { category: "Integrations", sortOrder: 1, title: "Zoho CRM Integration", slug: "zoho-crm", content: `# Zoho CRM Integration

## Setup
See the Zoho Settings page for initial configuration (Client ID, Secret, Authorization).

## Features
- **Auto-create**: Check "Also create in Zoho CRM" when creating a new lead
- **Sync**: Click "Sync with Zoho" on any linked lead to push/pull changes
- **View in Zoho**: Direct link to open the lead in Zoho CRM

## Lead Management Tools (Zoho Settings page)
- **Find & Link**: Discover Portal leads that exist in Zoho but aren't connected
- **Import from Zoho**: Bring Zoho-only leads into the Portal
- **Export to Zoho**: Push Portal-only leads to Zoho CRM` },

  // Notifications
  { category: "Settings", sortOrder: 1, title: "Notification Preferences", slug: "notification-preferences", content: `# Notification Preferences

## Configuring Notifications
Go to **Notifications** in the sidebar to manage your email notification preferences.

## Notification Types
| Event | Description |
|-------|------------|
| New Lead Created | Any new lead in the system |
| Email Sent to Customer | When someone sends an email on your watched leads |
| Customer Response | Customer opens an email or replies |
| Customer Portal Visit | Customer visits their project page |
| Customer Comment | Customer leaves feedback on any section |
| Lead Status Change | Status update on watched leads |
| Lead Assigned | A lead is assigned to you |
| SOW Signed | Customer signs a Scope of Work |
| NDA Signed | Customer signs an NDA |
| Task Completed | An assigned task is marked as completed |

## Notification Email
By default, notifications go to your profile email. You can set a separate notification email address on this page.

## Default
All notifications are ON by default. Toggle any off if you don't want those alerts.` },

  // Tasks
  { category: "Collaboration", sortOrder: 1, title: "Tasks & Next Steps", slug: "tasks-next-steps", content: `# Tasks & Next Steps

## Creating a Task
1. On the lead detail page, find **"Next Steps"** in the right column
2. Enter the task description
3. Set an optional **due date**
4. Select an **assignee** (defaults to you, can assign to any admin)
5. Press Enter or click **"Add Step"**

## Managing Tasks
- **Complete**: Click the checkbox to mark as done
- **Reassign**: Click the assignee name dropdown to reassign
- **Delete**: Click the X button

## Visual Indicators
- **Overdue tasks**: Red background with bold due date
- **Completed tasks**: Green background with strikethrough and completion date
- **Normal tasks**: Gray background

## Dashboard Integration
Your pending tasks appear in the **"My Tasks"** section on the Dashboard. Overdue tasks are highlighted.

## Notifications
When a task is assigned to someone else, they receive an email notification with the task details and due date.` },

  // Portfolio
  { category: "Sales Tools", sortOrder: 1, title: "Using the Portfolio", slug: "using-portfolio", content: `# Using the Portfolio

The Portfolio section helps you prepare for customer calls and meetings with pitch scripts, project references, and shareable resources.

## Services
Services represent what KITLabs offers. Each service has:
- **Description**: What the service includes
- **Pitch Scripts**: Email, Phone, and Meeting scripts with a Copy button
- **URLs**: Shareable links (website pages, blog posts)
- **Documents**: Pitch decks, one-pagers, proposals
- **Linked Projects**: Completed projects that demonstrate this service

## Projects
Projects are completed work that serves as social proof. Each project has:
- **Details**: Description, category, domain, technologies used
- **Client Info**: Customer name and background
- **Demo Video**: Link to a recorded walkthrough
- **Documents**: Case studies, architecture diagrams
- **Pitch Scripts**: Project-specific email/phone/meeting scripts

## Before a Customer Call
1. Go to Portfolio → find the relevant service
2. Read the **Phone Script** for talking points
3. Check linked **Projects** for case studies
4. Have relevant URLs ready to share

## Before Sending a Pitch Email
1. Open the relevant Service or Project
2. Click **"Copy"** on the Email Script
3. Paste into your email compose and customize

## Before a Meeting
1. Review the **Meeting Script** for structure
2. Open the pitch deck from **Documents**
3. Prepare 1-2 **Project** case studies to reference` },

  // Live Chat
  { category: "Collaboration", sortOrder: 2, title: "Live Chat with Customers", slug: "live-chat", content: `# Live Chat with Customers

The Live Chat feature enables real-time messaging between admin and customers directly within the portal.

## Admin Side
- **Floating chat widget** (bottom-right) on every lead detail page
- Click the blue chat bubble to open the conversation
- Messages poll every **3 seconds** when open for near real-time feel
- **Sound notification** plays when a new customer message arrives
- Unread messages auto-open the chat widget

## Messages Page (/messages)
- Access via **"Live Chat"** in the sidebar
- **Unread tab**: All unread customer messages with red NEW badges
- **All Conversations tab**: Grouped by lead with unread count
- Click any conversation to go directly to the lead

## Notification Badge
The **Live Chat** item in the sidebar shows a red badge with unread count, updating every 15 seconds.

## Customer Side
- Floating chat bubble on the customer portal (bottom-right)
- **Auto-opens after 10 seconds** when customer is signed in
- Sound notification when admin replies
- Requires sign-in to send messages

## Email Notifications
- Customer message → admin watchers get email notification
- Admin reply → customer gets email with "View & Reply" button

## Do Not Contact
If a lead has Do Not Contact enabled, the admin reply input is disabled.` },

  // Email Drafts
  { category: "Email System", sortOrder: 2, title: "Email Drafts", slug: "email-drafts", content: `# Email Drafts

Save email drafts to compose later without sending.

## Saving a Draft
1. Open the lead detail page
2. Click **"Compose Email"**
3. Write your subject and body
4. Click **"Save Draft"** instead of Send

## Managing Drafts
- Drafts appear as **amber cards** below the Compose Email button
- Click **"Edit"** to load a draft back into the compose form
- Click **"Delete"** to discard a draft
- You can save **multiple drafts** per lead

## Sending a Draft
1. Click "Edit" on a draft
2. The subject, body, CC, and BCC are restored
3. Make any final changes
4. Click **"Send"** to send it

When editing a saved draft, the button changes to **"Update Draft"**.` },

  // NAICS
  { category: "Lead Management", sortOrder: 4, title: "NAICS Industry Classification", slug: "naics-classification", content: `# NAICS Industry Classification

Classify leads by industry using the North American Industry Classification System (NAICS 2022).

## On Lead Detail (Edit Mode)
1. Click **"Edit"** on the lead
2. Find the **"Industry Sector (NAICS)"** dropdown
3. Select a 2-digit sector (e.g., "52 — Finance and Insurance")
4. The **Subsector** dropdown filters to show only subsectors under that sector
5. Select a 3-digit subsector (e.g., "522 — Credit Intermediation")
6. Click **"Save Changes"**

## Viewing Classification
In view mode, NAICS codes appear as colored badges:
- **Indigo** badge for the sector
- **Teal** badge for the subsector

## NAICS Codes Management (/naics-codes)
- Browse all 20 sectors and 96 subsectors
- Expandable accordion — click a sector to see its subsectors
- Search by code or name
- First-time setup: click **"Load NAICS Codes"** to seed the database` },

  // Comments & Replies
  { category: "Collaboration", sortOrder: 3, title: "SOW & App Flow Comments", slug: "sow-appflow-comments", content: `# SOW & App Flow Comments

Customers can leave comments on SOW documents and App Flow diagrams. Admins can reply directly from the lead detail page.

## Viewing Customer Comments
On the lead detail page:
- **SOW section**: Comments are grouped by SOW version
- **App Flow section**: Comments are grouped by flow name
- Customer comments appear left-aligned (gray)
- Admin replies appear right-aligned (blue)

## Replying to Comments
1. Find the comments under the SOW or App Flow section
2. Click **"Reply to comments"**
3. Type your reply in the input field
4. Press Enter or click **"Reply"**

## Email Notifications
When you reply, the customer receives an email with your response and a link back to the portal.

## Customer Side
Customers see all comments (theirs and admin replies) in the SOW and App Flow tabs on their portal.` },

  // Do Not Contact
  { category: "Lead Management", sortOrder: 5, title: "Do Not Contact", slug: "do-not-contact", content: `# Do Not Contact

The Do Not Contact flag prevents all outbound communication to a customer.

## How It Works
When a lead status is changed to **Lost**, **No Response**, **On Hold**, or **Cancelled**, the Do Not Contact flag is **automatically enabled**.

## What Gets Blocked
- Compose Email button is disabled
- Welcome email Send/Resend is hidden
- NDA send returns an error
- SOW share returns an error
- App Flow share returns an error
- "Notify Customer" checkbox is disabled
- Live Chat reply input is disabled

## Re-enabling Communication
1. Find the red **"Do Not Contact"** banner on the lead detail page
2. Click **"Disable"**
3. Communication is now re-enabled

## Audit Trail
Both enabling and disabling Do Not Contact is logged in the audit trail.` },

  // Knowledge Base
  { category: "Getting Started", sortOrder: 3, title: "Using the Knowledge Base", slug: "using-knowledge-base", content: `# Using the Knowledge Base

You're reading it! The Knowledge Base is your go-to resource for learning how to use every feature in Leads Portal.

## Finding Articles
- **Search**: Type in the search bar to find articles by title or content
- **Categories**: Click category pills to filter (Getting Started, Lead Management, etc.)
- **Browse**: Articles are grouped by category in a card grid

## Sharing Articles
Every article has a unique URL based on its slug (e.g., /knowledge/creating-lead). Click **"Share Link"** to copy the URL and share with other admins.

## Creating Articles
1. Click **"+ New Article"** on the Knowledge Base page
2. Enter a title (slug auto-generates)
3. Select a category
4. Write content using **Markdown**
5. Click **"Publish Article"**

## Markdown Support
- \`# Heading 1\`, \`## Heading 2\`, \`### Heading 3\`
- \`**bold**\`, \`*italic*\`, \`\\\`code\\\`\`
- \`- list items\` and \`1. numbered lists\`
- \`| tables | with | pipes |\`

## First-Time Setup
If the Knowledge Base is empty, click **"Load Default Articles"** to populate 15+ articles covering all features.` },

  // API Integration
  { category: "Integrations", sortOrder: 2, title: "External API (v1)", slug: "external-api", content: `# External API (v1)

The external API allows automation tools (like push_to_crm.py, Apollo scripts) to create and list leads programmatically.

## Authentication
All requests require a Bearer token:
\`\`\`
Authorization: Bearer YOUR_API_TOKEN
\`\`\`

## Create a Lead (POST /api/v1/leads)
Send a JSON body with at minimum: projectName, customerName, customerEmail, projectDescription.

### All Available Fields
- **Required**: projectName, customerName, customerEmail, projectDescription
- **Contact**: phone, linkedinUrl, apolloUrl, jobTitle, companyName, location
- **Company**: industry, companySize, companyWebsite, aboutCompany
- **Classification**: leadSource (11 values), leadStatus (12 values)
- **Tracking**: extractedDate, lastContactedDate, leadScore (1-100)
- **Outreach**: connectionRequestSent, connectionAccepted, initialMessageSent, meetingBooked, meetingDate, responseReceived

### Lead Sources
MANUAL, AGENT, BARK, LINKEDIN_SALES_NAV, APOLLO, LINKEDIN_COMPANY_PAGE, REFERRAL, WEBSITE, COLD_OUTREACH, EVENT, OTHER

## List Leads (GET /api/v1/leads)
Supports filters: status, stage, source, industry, assignedTo, search. Paginated with page + limit params.

## API Docs
Visit **/api-docs** in the admin portal for interactive Swagger documentation.` },

  // New Features (v4.2-4.5)
  { category: "Getting Started", sortOrder: 3, title: "Release History", slug: "release-history", content: `# Release History

The Release History page provides a complete version timeline for the Leads Portal.

## Accessing Release History

Navigate to **Release History** in the admin sidebar (bottom section, tag icon).

## What You'll See

- **Current Build**: The git commit SHA and build timestamp of the running deployment
- **Latest Release Banner**: Shows the most recent version with a count of changes
- **Version Timeline**: Every release with:
  - Version number (e.g., v4.4)
  - Release date
  - Git commit ID (clickable — links to GitHub)
  - List of changes with checkmark bullets

## How It Works

- Release data is maintained in \`apps/admin/src/data/releases.ts\`
- The build commit SHA is injected at build time via Docker and displayed at the top
- Each new deployment automatically shows the latest build ID
- The latest release is highlighted with a blue accent and "Latest" badge` },

  { category: "Email System", sortOrder: 3, title: "System Email Templates", slug: "system-email-templates", content: `# System Email Templates

The system automatically sends emails to customers for various events (welcome, status updates, document sharing, etc.). Admins can now customize the content of these system emails.

## Accessing System Templates

1. Go to **Email Templates** in the sidebar
2. Click the **System Templates** tab (next to Compose Templates)

## Compose vs System Templates

The Email Templates page has two tabs:
- **Compose Templates**: User-created templates for manual email composition. These are the only templates shown in the email compose dropdown on lead detail and in the email flow builder.
- **System Templates**: Automated email templates triggered by the system. These are NOT shown in email compose or flow builder — they are only used by the system when specific events occur.

## Available System Templates (12)

| Template | When It's Sent |
|----------|---------------|
| Welcome Email | When a new lead is created or welcome email is triggered |
| Status Update | When project status changes |
| NDA Ready | When an NDA is shared with the customer |
| SOW Ready | When a Scope of Work is shared |
| App Flow Ready | When an app flow diagram is shared |
| SOW Comment Reply | When admin replies to a customer's SOW comment |
| App Flow Comment Reply | When admin replies to an app flow comment |
| Admin Message | When admin sends a message via live chat |
| NDA Signed Confirmation | Sent to customer after NDA is signed |
| SOW Signed Confirmation | Sent to customer after SOW is approved |
| Task Assigned | When a task is assigned to an admin |
| Task Completed | When an assigned task is marked as completed |

## Editing a Template

1. Click any system template card to open the editor
2. A purple **System Template** banner shows the template key and available merge tags
3. Edit the **Subject** and **Body** using the rich text editor
4. **Click any merge tag** to copy it to your clipboard (e.g., \`{{customerName}}\`)
5. Paste merge tags into your template — they'll be replaced with actual values when emails are sent
6. Click **Save** to update

## Merge Tags

Merge tags are placeholders that get replaced with real data. Common tags:

- \`{{customerName}}\` — The customer's full name
- \`{{projectName}}\` — The project name
- \`{{portalUrl}}\` — Link to the customer portal
- \`{{statusLabel}}\` — The new status (for status update emails)
- \`{{adminName}}\` — The admin who sent the message/reply

Each template shows its specific available tags in the purple banner.

## Important Notes

- System templates **cannot be deleted** (the delete button is hidden)
- If a template is accidentally corrupted, you can restore it by re-running the database seed
- Changes take effect immediately — the next email sent will use your updated template
- If the template is missing from the database, the system falls back to the built-in default` },

  { category: "Email System", sortOrder: 4, title: "Email Unsubscribe", slug: "email-unsubscribe", content: `# Email Unsubscribe

All customer-facing emails now include an unsubscribe link at the bottom. This allows customers to opt out of email communications.

## How It Works

1. Every email sent to a customer includes a small "unsubscribe here" link at the bottom
2. Clicking the link takes the customer to the **Customer Portal Unsubscribe Page**
3. The page shows their email address (pre-filled) and two buttons:
   - **Unsubscribe** (red) — stops all email communications
   - **Cancel — I changed my mind** — goes back to the portal

## What Happens When a Customer Unsubscribes

1. **Do Not Contact** is enabled on ALL leads matching that email address
2. An **audit log** entry is created: "Customer Unsubscribed from Emails"
3. An **email notification** is sent to the assigned admin and all watchers with a red "Customer Unsubscribed" header
4. The customer sees a confirmation page

## Re-Enabling Communications

If a customer changes their mind:
1. Go to the lead detail page in admin portal
2. Find the red **Do Not Contact** banner at the top
3. Click **Disable** to re-enable email communications

## Which Emails Include the Unsubscribe Link?

All 10+ customer-facing email types: welcome, status update, NDA/SOW/App Flow ready, manual compose, admin messages, comment replies, and signed confirmations.` },

  { category: "Lead Management", sortOrder: 6, title: "Admin Preview Mode", slug: "admin-preview-mode", content: `# Admin Preview Mode

Admin Preview Mode lets you view the customer portal as if you were the customer — without triggering any visit tracking, email notifications, or audit log entries.

## How to Use It

1. Open any lead's detail page in the admin portal
2. Scroll down to the project info section
3. You'll see two URL boxes:
   - **Customer Portal URL** (blue) — The link shared with customers. Visiting this triggers tracking
   - **Admin Preview URL** (amber, labeled "no tracking") — Safe for admin to visit without triggering anything

4. Click the **copy button** on the Admin Preview URL
5. Open it in a new tab — you'll see the customer portal without any notifications being sent

## What's Different in Preview Mode?

- **No visit tracking** — No "Customer Portal Visit" audit entry or email to watchers
- **No notification emails** — Admin watchers won't be notified
- **Full functionality** — Everything else works normally (SOW viewing, app flows, etc.)

## How It Works (Technical)

The Admin Preview URL includes a signed HMAC token (\`&preview=<token>\`). This token is verified by the customer portal — only someone with access to the server's SESSION_SECRET can generate a valid token. It's not guessable.` },

  { category: "Collaboration", sortOrder: 4, title: "Customer Portal Navigation", slug: "customer-portal-navigation", content: `# Customer Portal Navigation

The customer portal uses a **left sidebar** for navigation, similar to the admin portal.

## Sidebar Features

- **Collapse/Expand**: Click the chevron to collapse the sidebar to icons only
- **Hover Expand**: When collapsed, hover over the sidebar to temporarily see labels
- **Pin/Lock**: Click the pin icon to keep the sidebar permanently open
- **Persistence**: Sidebar state (collapsed/locked) is saved to the browser — customers won't have to re-expand every visit

## Navigation Items

| Item | Icon | Description |
|------|------|-------------|
| Overview | Grid | Project dashboard with cards and description |
| Scope of Work | Document | SOW documents (only visible when shared) |
| App Flow | Arrows | App flow diagrams (only visible when shared) |
| NDA | Shield | Non-disclosure agreement (only visible when shared) |
| Book Meeting | Calendar | Schedule time with the team |

Items that aren't available yet show as grayed out with a "Soon" badge.

## Mobile View

On mobile devices, the sidebar becomes a hamburger menu:
- Tap the hamburger icon (top-left) to open the sidebar as an overlay
- Tap outside or navigate to close it

## Overview Dashboard Cards

The Overview page shows four main cards:
1. **NDA** — Shows status (signed/ready/not shared) or a "Request NDA" link
2. **Scope of Work** — Shows version count or "Not yet shared"
3. **App Flow** — Shows flow count or "Not yet shared"
4. **Book Meeting** — Always available, links to booking page

Cards that aren't shared yet appear with a dashed border and reduced opacity.` },

  { category: "Collaboration", sortOrder: 5, title: "NDA Request from Customer", slug: "nda-request", content: `# NDA Request from Customer

Customers can now request an NDA directly from the customer portal, even before you've shared one.

## How It Works (Customer Side)

1. Customer visits their portal and sees the **NDA card** on the Overview page
2. If no NDA has been shared yet, the card shows a **"Request NDA"** link
3. Clicking it opens a modal with:
   - A pre-written, editable message (professional, friendly tone)
   - An **upload button** to attach their own NDA document (PDF or Word, max 10MB)
   - **Submit Request** and **Cancel** buttons
4. After submitting, the card updates to show "Request sent — we'll get back to you soon"

## What Happens on Submit (Admin Side)

1. A **note** is created on the lead with the customer's message (prefixed with "[NDA Request]")
2. An **audit log** entry: "NDA Requested by Customer"
3. An **email notification** is sent to the assigned admin and all watchers with:
   - The customer's message
   - Mention of any attached file
   - A "View Lead & Send NDA" button linking to the admin portal

## Finding NDA Requests

- Check the lead's **Notes** section — NDA requests appear with a "[NDA Request]" prefix
- Check the **Audit Log** for "NDA Requested by Customer" entries
- Check your email for the NDA Request notification

## Responding to an NDA Request

1. Open the lead in admin portal
2. Go to the NDA section
3. Generate or upload an NDA as usual
4. Send it to the customer — they'll receive the NDA Ready email` },

  { category: "Collaboration", sortOrder: 6, title: "Your Representative (Customer Portal)", slug: "customer-representative", content: `# Your Representative

The customer portal now shows the assigned admin as the customer's "Representative" — giving customers a personal point of contact.

## What Customers See

On the Overview page, next to the project description, there's a **"Your Representative"** card showing:
- **Profile photo** (or initials if no photo uploaded)
- **Admin's name**
- **"Project Representative"** title
- **Email address** (clickable mailto link)
- **Project start date**

If no admin is assigned yet, customers see: "A representative will be assigned shortly."

## Setting Up Your Profile Photo

1. Go to **My Profile** in the admin sidebar
2. Click the profile picture area to upload a photo
3. The photo will appear on the customer portal for all leads assigned to you

## How Assignment Works

- When you create a lead, you're automatically assigned as the representative
- You can reassign leads from the lead detail page using the assignment dropdown
- The customer portal updates automatically when assignment changes` },

  { category: "Settings", sortOrder: 2, title: "Branding & Chat Widget", slug: "branding-chat-widget", content: `# Chat Widget

The live chat widget appears on the customer portal as a floating chat bubble in the bottom-right corner.

## Customer Experience

- A **chat bubble** appears after 10 seconds on the page
- Clicking it opens the chat panel with a welcome message: "We are here to help you by answering any question. Please send us your question."
- Customers must be signed in to send messages
- The **close button** is in the top-right corner of the chat header
- When new admin messages arrive, a sound plays and an unread badge appears

## Admin Experience

- Messages appear in the **Live Chat** section in the sidebar (with unread count badge)
- The **/messages** page shows all conversations: Unread tab + All Conversations tab
- On individual lead detail pages, a floating chat widget shows the conversation
- **Do Not Contact** blocks admin replies

## Notifications

- When a customer sends a message: admin watchers + assigned admin get an email
- When an admin replies: customer gets an email notification` },
];

export async function POST() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let created = 0;
  let skipped = 0;

  for (const article of ARTICLES) {
    const existing = await prisma.knowledgeArticle.findUnique({ where: { slug: article.slug } });
    if (existing) { skipped++; continue; }

    await prisma.knowledgeArticle.create({
      data: {
        ...article,
        tags: [],
        createdBy: session.name,
      },
    });
    created++;
  }

  return NextResponse.json({ created, skipped, total: ARTICLES.length });
}
