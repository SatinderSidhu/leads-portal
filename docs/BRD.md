# Business Requirements Document (BRD)

## Leads Portal — Lead Management System for Mobile Apps & Web Platforms

| Field | Detail |
|-------|--------|
| Document Version | 1.8 |
| Last Updated | March 13, 2026 |
| Status | Active |

---

## 1. Executive Summary

The Leads Portal is a web-based lead management system designed to streamline the process of capturing, managing, and communicating with potential clients for mobile app and web platform development projects. The system consists of two separate web portals — an **Admin Portal** for internal use and a **Customer Portal** for client-facing interactions — both connected to a shared database.

---

## 2. Business Objectives

1. Centralize lead management into a single system
2. Enable quick and efficient lead entry by admin users
3. Provide an automated, professional welcome experience for new clients
4. Give customers a self-service portal to view their project information
5. Maintain a clear record of all leads and their communication status
6. Support automated lead ingestion from external BD agents via API

---

## 3. Stakeholders

| Role | Description |
|------|-------------|
| Admin | Internal team member responsible for entering and managing leads (database-backed user accounts) |
| Customer | External client who has been entered as a lead |
| BD Agent | External automated system that submits leads via API |

---

## 4. System Overview

### 4.1 Admin Portal

A secure, internal-only web application for managing leads.

**Access Control:**
- Protected behind username/password authentication
- Multiple admin user accounts stored in the database (AdminUser model)
- Passwords hashed with bcryptjs; inactive accounts are blocked from login
- Default seeded credentials: username `admin`, password `admin`
- Session cookie stores `userId:sessionSecret` — enables audit trail tracking
- Session-based authentication with secure HTTP-only cookies

### 4.2 Customer Portal

A public-facing, interactive web application for customers to view their project details.

**Access Method:**
- Accessed via a unique URL containing a lead ID as a query parameter
- No login required — access is granted via the unique link
- Link is shared with customers via the welcome email

---

## 5. Feature Specifications

### 5.1 Admin Portal Features

#### 5.1.1 Admin Login

| Aspect | Detail |
|--------|--------|
| Purpose | Secure access to the admin portal |
| Fields | Username, Password |
| Validation | Must match an active AdminUser in the database (bcrypt comparison) |
| On Success | Redirect to Dashboard; session cookie set with admin user ID |
| On Failure | Display error message "Invalid username or password" |
| Session Duration | 24 hours |

**Business Rules:**
- Unauthenticated users are automatically redirected to the login page
- Session persists across browser refreshes within the 24-hour window
- Logout option available from the dashboard
- Inactive admin accounts (`active: false`) are blocked from logging in
- Session cookie format: `adminUserId:sessionSecret` — used for audit trail

#### 5.1.2 Leads Dashboard

| Aspect | Detail |
|--------|--------|
| Purpose | View all entered leads at a glance |
| Format | Table/grid layout |
| Sorting | Most recent leads displayed first |

**Grid Columns:**

| Column | Description |
|--------|-------------|
| Project Name | Name of the client's project |
| Customer Name | Full name of the customer |
| Customer Email | Email address of the customer |
| Created Date | Date the lead was created |
| Email Status | Whether the welcome email has been sent (Sent / Not sent) |

**Available Actions:**
- "New Lead" button — navigates to the Create Lead form
- "Logout" button — ends the admin session

**Empty State:**
- When no leads exist, display a message "No leads yet" with a call-to-action to create the first lead

#### 5.1.3 Create New Lead

| Aspect | Detail |
|--------|--------|
| Purpose | Enter a new lead into the system |
| Navigation | Accessible from the Dashboard via "New Lead" button |

**Form Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Project Name | Text input | Yes | Cannot be empty |
| Customer Name | Text input | Yes | Cannot be empty |
| Customer Email | Email input | Yes | Must be valid email format |
| Project Description | Textarea | Yes | Cannot be empty |

**Submit Actions:**

| Button | Behavior |
|--------|----------|
| Save Only | Saves the lead to the database and redirects to the Dashboard |
| Save and Inform Client | Saves the lead to the database, sends a welcome email to the customer, and redirects to the Dashboard |

**Business Rules:**
- Both buttons are disabled until all fields are filled
- If the email fails to send, the lead is still saved (with a warning logged)
- The email status is tracked in the database for visibility on the Dashboard

#### 5.1.4 Welcome Email

| Aspect | Detail |
|--------|--------|
| Trigger | Admin clicks "Save and Inform Client" |
| Recipient | Customer's email address |
| Subject | "Welcome to {Project Name}!" |

**Email Content:**
- Personalized greeting with customer name
- Mention of the project name
- Call-to-action button linking to the Customer Portal
- The link contains the lead's unique ID as a query parameter

#### 5.1.5 Lead Detail View

| Aspect | Detail |
|--------|--------|
| Purpose | View full details of a lead, manage status, edit/delete, and add notes |
| Access | Click on any lead row in the Dashboard grid |

**Displayed Information:**
- Project details (name, customer, email, description, creation date, email status)
- Current status with color-coded badge
- Notes section with ability to add new notes (shows author name)
- Status history timeline (shows who made each change)
- Audit info: "Created by" and "Last updated by" with timestamps

**Available Actions:**
- "Edit" button — toggles inline editing of project name, customer name, email, and description
- "Delete" button — confirmation dialog, then permanently removes lead and all associated data
- Status update, add notes, generate/view NDA (existing features)

#### 5.1.5a Lead Edit

| Aspect | Detail |
|--------|--------|
| Purpose | Allow admin to edit lead details from the detail view |
| Mode | Inline editing — fields toggle between view and edit mode |

**Editable Fields:**

| Field | Type | Required |
|-------|------|----------|
| Project Name | Text input | Yes |
| Customer Name | Text input | Yes |
| Customer Email | Email input | Yes |
| Project Description | Textarea | Yes |

**Business Rules:**
- "Edit" button toggles the project details card into edit mode
- "Cancel" reverts to original values without saving
- "Save Changes" validates all fields are non-empty, then sends PUT request
- On save, the `updatedBy` field is set to the current admin's name
- Edit button hidden during edit mode

#### 5.1.5b Lead Delete

| Aspect | Detail |
|--------|--------|
| Purpose | Allow admin to permanently remove a lead |
| Confirmation | Browser confirm dialog with project name |

**Business Rules:**
- Confirmation message warns about permanent deletion of associated notes, status history, and NDA
- On confirm, sends DELETE request to API
- On success, redirects admin to the dashboard
- Cascade delete: all associated notes, status history, and NDA records are removed

#### 5.1.5c Audit Trail

| Aspect | Detail |
|--------|--------|
| Purpose | Track who created, edited, and updated leads |
| Scope | Lead creation, lead edit, status changes, notes |

**Tracked Actions:**

| Action | Field | Stored Value |
|--------|-------|-------------|
| Lead created (admin UI) | `lead.createdBy` | Admin user's name |
| Lead created (external API) | `lead.createdBy` | "API" |
| Lead edited | `lead.updatedBy` | Admin user's name |
| Status changed | `statusHistory.changedBy` | Admin user's name |
| Note added | `note.createdBy` | Admin user's name |

**Display:**
- Lead detail page shows "Created by {name} on {date}" and "Last updated by {name} on {date}"
- Status history timeline shows "{admin name}" before the timestamp
- Notes show "{admin name}" before the timestamp

#### 5.1.6 Status Management

| Aspect | Detail |
|--------|--------|
| Purpose | Track the lifecycle of a lead through project phases |
| Default Status | NEW (set automatically on lead creation) |

**Available Statuses:**

| Status | Display Label |
|--------|--------------|
| NEW | New |
| DESIGN_READY | Design Ready |
| DESIGN_APPROVED | Design Approved |
| BUILD_IN_PROGRESS | Build In Progress |
| BUILD_READY_FOR_REVIEW | Build Ready for Review |
| BUILD_SUBMITTED | Build Submitted |
| GO_LIVE | Go Live |

**Status Update Process:**
- Admin selects a new status from the dropdown
- Optional: Check "Notify Customer" to send a status update email
- Click "Update Status" to save the change
- A status history record is created for every change

#### 5.1.7 Notes System

| Aspect | Detail |
|--------|--------|
| Purpose | Allow admin to add timestamped notes to a lead |
| Behavior | Append-only — notes cannot be edited or deleted |
| Visibility | Notes are visible to customers on the Customer Portal |

#### 5.1.8 Status Update Email

| Aspect | Detail |
|--------|--------|
| Trigger | Admin checks "Notify Customer" when changing status |
| Recipient | Customer's email address |
| Subject | "{Project Name} — Status Update: {New Status}" |

**Email Content:**
- Greeting with customer name
- New status displayed prominently
- Call-to-action button linking to Customer Portal
- The link contains the lead's unique ID

#### 5.1.9 Admin User Management

| Aspect | Detail |
|--------|--------|
| Purpose | Create, edit, and manage admin user accounts |
| Access | Dashboard header "Admin Users" button → `/admin-users` |

**Admin User Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text input | Yes | Full name of the admin |
| Email | Email input | Yes | Email address (unique) |
| Username | Text input | Yes | Login username (unique) |
| Password | Password input | Yes (create) / Optional (edit) | Minimum 4 characters, hashed with bcryptjs |
| Active | Checkbox | No | Whether the user can log in (default: true) |

**Pages:**

| Page | Route | Purpose |
|------|-------|---------|
| Admin Users List | `/admin-users` | Table of all admin users with name, email, username, status, created date |
| Create Admin User | `/admin-users/new` | Form to create a new admin account |
| Edit Admin User | `/admin-users/[id]` | Edit admin details, change password, toggle active, delete |

**Business Rules:**
- Email and username must be unique across all admin users
- Password is hashed with bcryptjs (10 salt rounds) before storage
- On creation, a welcome email is sent to the admin's email with the admin portal URL and username
- Deactivating an admin (`active: false`) blocks them from logging in
- Admins can be deleted from the edit page with a confirmation dialog
- Admin list shows active/inactive status as a color-coded badge

#### 5.1.10 Admin Welcome Email

| Aspect | Detail |
|--------|--------|
| Trigger | New admin user created via `/admin-users/new` |
| Recipient | New admin's email address |
| Subject | "Welcome to {Company Name} Admin Portal" |

**Email Content:**
- Personalized greeting with admin name
- Username and admin portal URL displayed in a card
- Instruction to use the password provided by the administrator
- CTA button: "Go to Admin Portal"

#### 5.1.11 Dark Mode

| Aspect | Detail |
|--------|--------|
| Purpose | Toggle between light and dark themes in the admin portal |
| Toggle | Sun/moon icon button in the header of every page |
| Persistence | Theme preference saved in localStorage |

**Business Rules:**
- Default theme follows the user's preference from their last visit
- Falls back to light mode on first visit
- All pages and components support both themes via Tailwind CSS `dark:` classes
- Theme context provided via React Context (ThemeProvider)

### 5.2 Customer Portal Features

#### 5.2.1 Welcome / Project Page

| Aspect | Detail |
|--------|--------|
| Purpose | Display project information to the customer |
| Access | Via URL with `?id={leadId}` query parameter |
| Authentication | None — accessed via unique link |

**Displayed Information:**

| Field | Description |
|-------|-------------|
| Customer Name | Shown in a welcome greeting |
| Project Name | Displayed as the main heading |
| Current Status | Shown as a color-coded badge |
| Project Description | Full description of the project |
| Customer Email | Shown for reference |
| Status History | Timeline of all status changes with timestamps |
| Admin Comments | List of notes from admin with timestamps |

**Error States:**

| Scenario | Display |
|----------|---------|
| No ID in URL | "No Project ID Provided" message with instructions |
| Invalid/unknown ID | "Project Not Found" message |

#### 5.2.2 Google Analytics

| Aspect | Detail |
|--------|--------|
| Purpose | Track customer portal usage and engagement |
| Tag ID | G-8J4D4JHZGN |
| Integration | Google Tag Manager via Next.js `Script` component (`afterInteractive` strategy) |
| Scope | Customer portal only (all pages) |

### 5.3 App Flow Features

#### 5.3.1 Wireframe Mode

| Aspect | Detail |
|--------|--------|
| Purpose | Generate realistic mobile screen mockups as app flow diagrams |
| Layout | Horizontal left-to-right storyboard (screens read like a user journey) |
| Node Style | Phone-shaped frame with notch, status bar, typed UI elements, and home indicator |

**Available UI Element Types (17 total):**

| Element | Description |
|---------|-------------|
| nav-bar | Top navigation bar with hamburger menu and title |
| heading | Large heading text |
| text | Paragraph/body text |
| input | Text input field with label and placeholder |
| button | Primary filled button |
| button-outline | Secondary outlined button |
| image | Image placeholder |
| avatar | User avatar with name placeholder |
| search | Search bar |
| card | Content card with image and text |
| list | List of items |
| tab-bar | Bottom tab navigation |
| toggle | Toggle switch with label |
| divider | Horizontal separator line |
| checkbox | Checkbox with label |
| radio | Radio button with label |
| social-login | Social login button |
| map | Map placeholder |

**Business Rules:**
- AI generates 8-14 screens per app flow
- Each screen contains 4-8 realistic UI elements
- Screens are connected via labeled edges showing user navigation paths
- Backward compatible with older string-based element format

#### 5.3.2 Basic Mode

| Aspect | Detail |
|--------|--------|
| Purpose | Generate simple flowchart-style app flow diagrams |
| Layout | Vertical top-to-bottom with branching paths |
| Node Style | Rounded box with teal border, label, and optional description |

### 5.4 NDA (Non-Disclosure Agreement) Features

#### 5.4.1 NDA Generation (Admin)

| Aspect | Detail |
|--------|--------|
| Purpose | Generate a professional NDA for a lead to build customer trust |
| Trigger | Admin clicks "Generate NDA" on the lead detail page |
| Scope | One NDA per lead (one-to-one relationship) |

**NDA Template:**
- Pre-defined standard mutual NDA with auto-filled placeholders
- Placeholders: Company Name (from env), Customer Name, Project Name, Date
- Sections: Parties, Purpose, Confidential Info Definition, Obligations, Exclusions, Term (2 years), Return of Info, Governing Law, Signatures

**After Generation:**
- NDA is saved to the database
- A styled email is sent to the customer with a link to review and sign
- Admin sees NDA status on the lead detail page (Generated / Sent / Signed)

#### 5.4.2 NDA Ready Email

| Aspect | Detail |
|--------|--------|
| Trigger | NDA is generated by admin |
| Recipient | Customer's email address |
| Subject | "NDA Ready for Review — {Project Name}" |

**Email Content:**
- Greeting with customer name
- Notification that NDA is ready for review and signature
- CTA button: "Review & Sign NDA" linking to customer portal NDA page

#### 5.4.3 NDA Review & Signing (Customer Portal)

| Aspect | Detail |
|--------|--------|
| Purpose | Allow customer to view, download, and sign the NDA electronically |
| Access | Via URL with `?id={leadId}&tab=nda` |

**Displayed Information:**
- Full NDA document in a scrollable viewer
- "Download PDF" button for offline review
- Signature form (when not yet signed)

**Electronic Signature:**

| Field | Type | Required |
|-------|------|----------|
| Full Legal Name | Text input | Yes |
| Agreement Checkbox | Checkbox ("I have read and agree...") | Yes |

**Recorded Data:**
- Signer's full name (typed)
- Timestamp of signing
- Signer's IP address

**After Signing:**
- Green confirmation banner with signer name and date
- NDA status updated to "Signed"

#### 5.4.4 NDA Signed Confirmation Emails

| Aspect | Detail |
|--------|--------|
| Trigger | Customer signs the NDA |
| Recipients | Both the customer AND the admin |

**Customer Email:**
- Subject: "NDA Signed Successfully — {Project Name}"
- Confirmation with signer name and date

**Admin Email:**
- Subject: "NDA Signed by {Customer Name} — {Project Name}"
- Includes signer name, date, and IP address

### 5.5 API Integration Features

#### 5.5.1 Lead Source Tracking

| Aspect | Detail |
|--------|--------|
| Purpose | Distinguish between manually created leads and those from external agents |
| Field | Source (MANUAL or AGENT) |

**Source Values:**

| Value | Description |
|-------|-------------|
| MANUAL | Lead created by admin through the portal UI (default) |
| AGENT | Lead created via the external API by a BD agent |

**Display:**
- Source is shown on the leads dashboard table as a badge
- Source is shown on the lead detail page in the project details section

#### 5.5.2 External Leads API

| Aspect | Detail |
|--------|--------|
| Purpose | Allow external BD agents to programmatically submit leads |
| Endpoint | `POST /api/v1/leads` |
| Authentication | Bearer token (API_TOKEN) |
| Email Behavior | No emails are sent to the customer for API-created leads |

**Required Fields:**

| Field | Type | Validation |
|-------|------|------------|
| projectName | string | Non-empty |
| customerName | string | Non-empty |
| customerEmail | string | Valid email format |
| projectDescription | string | Non-empty |

**Business Rules:**
- All API-created leads are tagged with `source: AGENT`
- Leads are created with initial status `NEW`
- No welcome email is sent — admin manages communication manually
- Full API documentation provided in `docs/API-INTEGRATION.md`

### 5.6 Content Management Features

#### 5.6.1 Content Creation (Admin)

| Aspect | Detail |
|--------|--------|
| Purpose | Create social media content to be posted on various platforms |
| Access | Admin portal at `/content/new` |

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Title | Text input | Yes | Content title |
| Post Content | Textarea | Yes | Full post text |
| Media URL | URL input | No | Link to external media |
| Upload Media | File upload | No | Upload image/video (max 50MB) |
| Tags | Text input | No | Comma-separated tags |
| Target Platforms | Checkboxes | No | LinkedIn, Facebook, TikTok, Instagram |
| Status | Select | No | Draft (default), Published, Archived |

#### 5.6.2 Content List View

| Aspect | Detail |
|--------|--------|
| Purpose | View all created content at a glance |
| Format | Table layout with clickable rows |
| Columns | Title, Status, Platforms, Tags, Created date |
| Navigation | Accessible from dashboard via "Content" button |

#### 5.6.3 Content Edit/Delete

| Aspect | Detail |
|--------|--------|
| Purpose | Edit existing content or delete it |
| Access | Click on content row in the content list |
| Features | Pre-populated form, media preview, save/delete buttons |

#### 5.6.4 Content Status Workflow

| Status | Description |
|--------|-------------|
| DRAFT | Content is being worked on (default) |
| PUBLISHED | Content is approved and ready for posting |
| ARCHIVED | Content is no longer active |

#### 5.6.5 Content External API

| Aspect | Detail |
|--------|--------|
| Purpose | Allow external parties to create and manage content via API |
| Authentication | Bearer token (same API_TOKEN as leads API) |
| Endpoints | Full CRUD + file upload |
| Documentation | `docs/API-INTEGRATION.md` + interactive Swagger at `/api-docs` |

### 5.7 Lead Assignment & Watch List

#### 5.7.1 Lead Assignment

| Aspect | Detail |
|--------|--------|
| Purpose | Ensure every lead has a clear owner responsible for follow-up |
| Default | Leads are automatically assigned to the admin who creates them |

**Assignment Rules:**
- When an admin creates a lead via the portal, the lead is automatically assigned to that admin
- API-created leads (source = AGENT) have no initial assignment
- Admins can reassign a lead to any active admin user via a dropdown on the lead detail page
- On reassignment, the newly assigned admin receives an email notification with the lead details and a link to the lead detail page

**Lead Detail Page:**
- "Assigned To" dropdown showing all active admin users
- Selecting a different admin triggers reassignment and sends a notification email
- Current assignee is displayed prominently near the project details

#### 5.7.2 Watch List

| Aspect | Detail |
|--------|--------|
| Purpose | Allow admins to subscribe to updates on leads they are interested in but may not own |
| Default | The admin who creates a lead is automatically added as a watcher |

**Watch/Unwatch Behavior:**
- Any admin can watch or unwatch a lead via a button on the lead detail page
- The watch button displays the current number of watchers
- Watching a lead subscribes the admin to email notifications for key events on that lead

**Watcher Notifications:**
Watchers receive email notifications when any of the following occur on a watched lead:

| Event | Trigger |
|-------|---------|
| Status change | Admin updates the lead's status |
| Note added | Admin adds a note to the lead |
| SOW comment | Customer posts a comment on a SOW |
| App flow comment | Customer posts a comment on an app flow |

**Business Rules:**
- Notifications are sent to all watchers except the admin who performed the action (to avoid self-notification)
- The assigned admin is not automatically a watcher (though they are added as one on lead creation, they can unwatch)
- Watcher notifications are separate from the existing customer-facing emails (status update, SOW ready, etc.)

#### 5.7.3 Dashboard — My Leads Filter

| Aspect | Detail |
|--------|--------|
| Purpose | Help admins focus on the leads they are responsible for |
| Default View | Dashboard defaults to showing "My Leads" (leads assigned to the logged-in admin) |

**Filter Options:**
- "My Leads" — leads assigned to the current admin (default)
- Specific admin — leads assigned to a selected admin (dropdown of active admins)
- "All Leads" — all leads regardless of assignment

**Dashboard Enhancements:**
- "Assigned To" column added to the leads grid, displaying the assigned admin's name
- Filter persists via query parameter (`assignedTo=me`, `assignedTo={adminId}`, `assignedTo=all`)

---

## 6. Business Flows

### 6.1 Lead Creation Flow (Save Only)

```
Admin opens Dashboard
    ↓
Clicks "New Lead"
    ↓
Fills in all fields (Project Name, Customer Name, Email, Description)
    ↓
Clicks "Save Only"
    ↓
Lead is saved to database (emailSent = false)
    ↓
Admin is redirected to Dashboard
    ↓
New lead appears in the grid with "Not sent" email status
```

### 6.2 Lead Creation Flow (Save and Inform Client)

```
Admin opens Dashboard
    ↓
Clicks "New Lead"
    ↓
Fills in all fields (Project Name, Customer Name, Email, Description)
    ↓
Clicks "Save and Inform Client"
    ↓
Lead is saved to database
    ↓
Welcome email is sent to customer
    ↓
Lead's emailSent status is updated to true
    ↓
Admin is redirected to Dashboard
    ↓
New lead appears in the grid with "Sent" email status
```

### 6.3 Status Update Flow

```
Admin clicks on a lead in the Dashboard
    ↓
Lead Detail page opens
    ↓
Admin selects new status from dropdown
    ↓
Optionally checks "Notify Customer"
    ↓
Clicks "Update Status"
    ↓
Status is updated in database
    ↓
StatusHistory record is created
    ↓
[If Notify] → Status update email sent to customer
    ↓
Lead Detail page refreshes with new status
```

### 6.4 Add Note Flow

```
Admin opens Lead Detail page
    ↓
Types a note in the text area
    ↓
Clicks "Add Note"
    ↓
Note is saved to database
    ↓
Note appears in the notes list
    ↓
Note is visible on Customer Portal
```

### 6.5 NDA Generation Flow

```
Admin opens Lead Detail page
    ↓
Clicks "Generate NDA"
    ↓
NDA is generated from template with lead details
    ↓
NDA is saved to database (status = GENERATED)
    ↓
NDA Ready email is sent to customer
    ↓
NDA status updated to SENT
    ↓
Lead Detail page shows NDA status as "Sent to Customer"
```

### 6.6 NDA Signing Flow

```
Customer receives NDA Ready email
    ↓
Clicks "Review & Sign NDA" button
    ↓
Customer Portal opens with ?id={leadId}&tab=nda
    ↓
Customer reviews NDA document online
    ↓
[Optional] Customer downloads PDF for offline review
    ↓
Customer types full legal name
    ↓
Customer checks "I agree" checkbox
    ↓
Customer clicks "Sign NDA"
    ↓
NDA is signed (name, IP, timestamp recorded)
    ↓
Confirmation emails sent to both customer and admin
    ↓
Customer sees green "NDA Signed Successfully" banner
```

### 6.7 API Lead Ingestion Flow

```
External BD Agent sends POST /api/v1/leads
    ↓
Bearer token validated against API_TOKEN
    ↓
[Invalid] → 401 Unauthorized
[Valid] → Request body validated
    ↓
[Invalid fields] → 400 Validation failed with details
[Valid] → Lead created in database (source = AGENT, status = NEW)
    ↓
StatusHistory record created (fromStatus: null, toStatus: NEW)
    ↓
No email sent to customer
    ↓
201 Created — lead data returned
    ↓
Admin sees new lead on dashboard with "Agent" source badge
```

### 6.8 Customer Portal Access Flow

```
Customer receives welcome email
    ↓
Clicks "View Your Project" button in email
    ↓
Browser opens Customer Portal with ?id={leadId}
    ↓
Portal fetches lead data from database
    ↓
Welcome page is displayed with project details
```

### 6.4 Admin Login Flow

```
User navigates to Admin Portal URL
    ↓
Middleware checks for valid session cookie
    ↓
[No cookie] → Redirect to Login page
    ↓
User enters username and password
    ↓
[Valid] → Session cookie set, redirect to Dashboard
[Invalid] → Error message displayed
```

### 6.9 SOW Template Management Flow

```
Admin navigates to SOW Templates page
    ↓
Clicks "+ New Template"
    ↓
Fills in template details:
  - Template Name (required)
  - Description (when to use this template)
  - Industry (e.g. Healthcare, Fintech)
  - Project Type (e.g. Web Application, Mobile App)
  - Duration Range (e.g. 4-8 weeks)
  - Cost Range (e.g. $10k - $25k)
  - Set as Default (checkbox)
    ↓
Optionally uploads a reference file (PDF/DOCX)
  (existing SOW document to use as formatting guide)
    ↓
Writes HTML template content in RichTextEditor
  (section headings, layout patterns, boilerplate text)
    ↓
Previews template content via toggle
    ↓
Clicks "Create Template"
    ↓
Template is saved to database
    ↓
[If set as default] → Previous default is unset
```

### 6.10 SOW Generation with Template Flow

```
Admin opens SOW Builder for a lead
    ↓
Template dropdown appears with default pre-selected
    ↓
Admin can preview selected template inline
    ↓
Admin can switch to a different template or "No template"
    ↓
Admin fills in project details and clicks "Generate with AI"
    ↓
[Template selected] → Template content and/or uploaded file content extracted
    ↓
[Has uploaded file] → PDF/DOCX text extracted and injected as formatting reference
[Has editor content] → HTML content injected as formatting blueprint
[Has both] → Both injected; editor template takes precedence on conflicts
    ↓
AI generates SOW following the reference formatting, structure, and tone
    ↓
[No template] → AI uses built-in default section structure
    ↓
Generated SOW appears in editor for review and editing
```

### 6.11 Lead Assignment Flow

```
Admin creates a new lead
    ↓
Lead is auto-assigned to the creating admin
    ↓
Creating admin is auto-added as a watcher
    ↓
Lead appears in admin's "My Leads" dashboard view
```

### 6.12 Lead Reassignment Flow

```
Admin opens Lead Detail page
    ↓
Selects a different admin from the "Assigned To" dropdown
    ↓
PUT /api/leads/[id]/assign sent with new admin ID
    ↓
Lead assignment updated in database
    ↓
Notification email sent to newly assigned admin
    ↓
Lead detail page refreshes with updated assignment
```

### 6.14 SOW Template File Upload & Extraction Flow

```
Admin creates/edits a SOW Template
    ↓
Optionally uploads a PDF or DOCX reference file
    ↓
File saved to public/uploads/sow-templates/
    ↓
Template card shows file indicator badge on template list
    ↓
Admin selects this template when generating a SOW for a lead
    ↓
System extracts content from uploaded file:
  - DOCX → HTML (preserves headings, lists, tables via mammoth)
  - PDF → plain text (via pdf-parse)
    ↓
Extracted content injected into AI prompt as formatting reference
    ↓
AI generates SOW following the reference document's structure and tone
```

### 6.15 Watch/Unwatch Flow

```
Admin opens Lead Detail page
    ↓
Clicks "Watch" button (or "Unwatch" if already watching)
    ↓
POST or DELETE /api/leads/[id]/watch
    ↓
Watcher record created or removed in database
    ↓
Button updates to reflect new watch state
    ↓
[If watching] Admin receives notifications for status changes, notes, and customer comments
```

---

## 7. Data Requirements

### 7.1 Lead Record

| Field | Type | Description |
|-------|------|-------------|
| ID | UUID | Unique identifier (non-sequential for security) |
| Project Name | String | Name of the project |
| Customer Name | String | Full name of the customer |
| Customer Email | String | Email address of the customer |
| Project Description | Text | Detailed project description |
| Source | Enum | How the lead was created (MANUAL or AGENT) |
| Status | Enum | Current lead status (NEW through GO_LIVE) |
| Email Sent | Boolean | Whether the welcome email was sent |
| Created By | String (nullable) | Name of the admin who created the lead (or "API") |
| Updated By | String (nullable) | Name of the admin who last edited the lead |
| Created At | Timestamp | When the lead was created |
| Updated At | Timestamp | When the lead was last modified |

### 7.2 Note Record

| Field | Type | Description |
|-------|------|-------------|
| ID | UUID | Unique identifier |
| Content | Text | Note content |
| Lead ID | UUID | Foreign key to Lead |
| Created By | String (nullable) | Name of the admin who created the note |
| Created At | Timestamp | When the note was created |

### 7.3 Status History Record

| Field | Type | Description |
|-------|------|-------------|
| ID | UUID | Unique identifier |
| From Status | Enum (nullable) | Previous status (null for initial) |
| To Status | Enum | New status |
| Lead ID | UUID | Foreign key to Lead |
| Changed By | String (nullable) | Name of the admin who changed the status |
| Created At | Timestamp | When the status change occurred |

### 7.4 NDA Record

| Field | Type | Description |
|-------|------|-------------|
| ID | UUID | Unique identifier |
| Lead ID | UUID | Foreign key to Lead (unique — one NDA per lead) |
| Content | Text | Full NDA document text |
| Status | Enum | NDA status (GENERATED / SENT / SIGNED) |
| Signer Name | String (nullable) | Full name typed by signer |
| Signer IP | String (nullable) | IP address of signer |
| Signed At | Timestamp (nullable) | When the NDA was signed |
| Created At | Timestamp | When the NDA was generated |

### 7.5 Admin User Record

| Field | Type | Description |
|-------|------|-------------|
| ID | UUID | Unique identifier |
| Name | String | Full name of the admin |
| Email | String (unique) | Email address |
| Username | String (unique) | Login username |
| Password | String | Bcrypt-hashed password |
| Active | Boolean | Whether the admin can log in (default: true) |
| Created At | Timestamp | When the admin was created |
| Updated At | Timestamp | When the admin was last modified |

### 7.6 SOW Template Record

| Field | Type | Description |
|-------|------|-------------|
| ID | UUID | Unique identifier |
| Name | String | Template name (e.g. "Standard Web App SOW") |
| Description | Text (nullable) | When to use this template |
| Content | Text (nullable) | HTML template content — structure/format for AI to follow |
| File Name | String (nullable) | Original name of uploaded reference file (PDF/DOCX) |
| File Path | String (nullable) | Server path to uploaded reference file |
| Industry | String (nullable) | Target industry (e.g. Healthcare, Fintech) |
| Project Type | String (nullable) | Target project type (e.g. Web Application, Mobile App) |
| Duration Range | String (nullable) | Typical duration (e.g. 4-8 weeks) |
| Cost Range | String (nullable) | Typical cost (e.g. $10k - $25k) |
| Is Default | Boolean | Whether this is the default template (only one can be default) |
| Created By | String (nullable) | Name of the admin who created the template |
| Updated By | String (nullable) | Name of the admin who last edited the template |
| Created At | Timestamp | When the template was created |
| Updated At | Timestamp | When the template was last modified |

### 7.7 Content Record

| Field | Type | Description |
|-------|------|-------------|
| ID | UUID | Unique identifier |
| Title | String | Content title |
| Body | Text | Full post content |
| Media URL | String (nullable) | URL to external media |
| Media File | String (nullable) | Path to uploaded file |
| Tags | JSON Array | Array of tag strings |
| Platforms | Enum Array | Target platforms (LINKEDIN, FACEBOOK, TIKTOK, INSTAGRAM) |
| Status | Enum | DRAFT, PUBLISHED, ARCHIVED |
| Created At | Timestamp | When the content was created |
| Updated At | Timestamp | When the content was last modified |

### 7.8 Lead Watcher Record

| Field | Type | Description |
|-------|------|-------------|
| ID | UUID | Unique identifier |
| Lead ID | UUID | Foreign key to Lead |
| Admin ID | UUID | Foreign key to AdminUser |
| Created At | Timestamp | When the watch was created |

**Constraints:**
- Unique on (Lead ID, Admin ID) — an admin can only watch a lead once

---

## 8. Non-Functional Requirements

| Requirement | Detail |
|-------------|--------|
| Availability | System should be available during business hours |
| Security | Admin portal must be protected; customer portal uses non-guessable UUIDs |
| Email Delivery | Emails should be sent via SMTP (Gmail App Password) |
| Performance | Dashboard should load all leads within 2 seconds |
| Browser Support | Modern browsers (Chrome, Firefox, Safari, Edge) |

---

## 9. Future Enhancements (Planned)

_This section will be updated as new features are planned and developed._

| Feature | Description | Priority |
|---------|-------------|----------|
| ~~Lead Status Tracking~~ | ~~Add status field~~ — **Implemented v1.1** | ~~High~~ |
| ~~Notes System~~ | ~~Admin notes visible to customers~~ — **Implemented v1.1** | ~~High~~ |
| ~~Status Update Emails~~ | ~~Email notifications on status changes~~ — **Implemented v1.1** | ~~High~~ |
| ~~NDA System~~ | ~~Generate, send, and e-sign NDAs~~ — **Implemented v1.2** | ~~High~~ |
| ~~API Integration~~ | ~~External BD agent API with auth token~~ — **Implemented v1.3** | ~~High~~ |
| ~~Content Management~~ | ~~CRUD for social media content with external API~~ — **Implemented v1.4** | ~~High~~ |
| ~~Multi-Admin & Audit~~ | ~~Admin user management, lead edit/delete, audit trail, dark mode~~ — **Implemented v1.5** | ~~High~~ |
| ~~Customer Portal Interactions~~ | ~~Allow customers to add comments/feedback on their project~~ — **Implemented v2.5** | ~~Medium~~ |
| ~~File Attachments~~ | ~~Allow admin to attach files (proposals, wireframes) to leads~~ — **Implemented v1.9** | ~~Medium~~ |
| ~~Search & Filter~~ | ~~Search and filter leads on the dashboard~~ — **Implemented v2.1** | ~~Medium~~ |
| ~~Email Templates~~ | ~~Customizable email templates for different scenarios~~ — **Implemented v1.6** | ~~Low~~ |
| Lead Analytics | Dashboard widgets showing lead statistics and trends | Low |
| ~~Notification System~~ | ~~In-app notifications for admin on customer activity~~ — **Implemented v3.0** | ~~Low~~ |
| ~~Zoho CRM Integration~~ | ~~Bidirectional lead sync with Zoho CRM~~ — **Implemented v2.7-2.9** | ~~High~~ |
| ~~Expanded Lead Fields~~ | ~~Job title, company, industry, outreach tracking, lead scoring~~ — **Implemented v2.8** | ~~High~~ |
| ~~Do Not Contact~~ | ~~Block outbound emails for closed/lost leads~~ — **Implemented v3.3** | ~~Medium~~ |
| ~~Audit Log~~ | ~~Complete activity trail per lead with customer engagement tracking~~ — **Implemented v3.2** | ~~Medium~~ |
| ~~Persistent Navigation~~ | ~~Sidebar navigation with breadcrumbs across all admin pages~~ — **Implemented v3.4** | ~~Medium~~ |

---

## 10. Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | March 5, 2026 | Initial document creation | — |
| 1.1 | March 6, 2026 | Added lead detail view, status tracking, notes system, status update emails | — |
| 1.2 | March 6, 2026 | Added NDA generation, e-signature, PDF download, and signed confirmation emails | — |
| 1.3 | March 6, 2026 | Added external API integration with Bearer token auth, LeadSource tracking (MANUAL/AGENT), API documentation | — |
| 1.4 | March 7, 2026 | Added content management system with CRUD, file upload, external API, Swagger/OpenAPI docs | — |
| 1.5 | March 7, 2026 | Added multi-admin auth (database-backed users with bcrypt), lead edit/delete, audit trail (who created/edited/updated), admin user management (CRUD + welcome email), dark mode toggle | — |
| 1.6 | March 12, 2026 | Added SOW template system: reusable templates with HTML content, metadata (industry, project type, duration/cost range), default flag, CRUD admin pages, template selector in SOW builder, AI prompt integration | — |
| 1.7 | March 13, 2026 | Lead assignment & watch list: auto-assign leads to creating admin, reassignment via dropdown with email notification, watch/unwatch leads with watcher notifications on status changes, notes, and customer comments, dashboard defaults to "My Leads" with assignment filter and column | — |
| 1.8 | March 13, 2026 | SOW template file upload (PDF/DOCX reference documents with content extraction for AI formatting), wireframe app flow upgrade (realistic mobile screen mockups with 17 typed UI element types, horizontal storyboard layout), Google Analytics on customer portal (G-8J4D4JHZGN), Nginx upload limit increased to 50M | — |
| 2.0 | March 28, 2026 | Branding system, Zoho CRM integration (OAuth, create/search/sync leads), Book Meeting tab, customer feedback comments, expanded lead fields (15 new fields, 11 sources, 12 stages) | — |
| 3.0 | March 31, 2026 | Configurable notification system (9 event types, per-admin preferences), customer portal visit tracking, central notification dispatcher, bidirectional Zoho sync, Find & Link / Import / Export tools | — |
| 3.2 | April 1, 2026 | AuditLog model (16+ events), activity feed with email opened + portal visits + pagination, email history logging (welcome/NDA/SOW/App Flow), resend welcome email, admin notes edit/delete, customer portal URL on lead detail | — |
| 3.3 | April 2, 2026 | Closed statuses (Lost/No Response/On Hold/Cancelled), Do Not Contact flag (auto-enabled, blocks all outbound), SOW PDF fix (html2pdf.js with HTML formatting + base64 images) | — |
| 3.4 | April 2, 2026 | Persistent sidebar navigation (AdminShell + Sidebar + Breadcrumbs), full-width page layouts, removed per-page headers | — |
