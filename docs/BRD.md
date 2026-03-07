# Business Requirements Document (BRD)

## Leads Portal — Lead Management System for Mobile Apps & Web Platforms

| Field | Detail |
|-------|--------|
| Document Version | 1.3 |
| Last Updated | March 6, 2026 |
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
| Admin | Internal team member responsible for entering and managing leads |
| Customer | External client who has been entered as a lead |
| BD Agent | External automated system that submits leads via API |

---

## 4. System Overview

### 4.1 Admin Portal

A secure, internal-only web application for managing leads.

**Access Control:**
- Protected behind username/password authentication
- Only authorized admin users can access the portal
- Current credentials: username `admin`, password `admin`
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
| Validation | Must match stored credentials |
| On Success | Redirect to Dashboard |
| On Failure | Display error message "Invalid username or password" |
| Session Duration | 24 hours |

**Business Rules:**
- Unauthenticated users are automatically redirected to the login page
- Session persists across browser refreshes within the 24-hour window
- Logout option available from the dashboard

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
| Purpose | View full details of a lead, manage status, and add notes |
| Access | Click on any lead row in the Dashboard grid |

**Displayed Information:**
- Project details (name, customer, email, description, creation date, email status)
- Current status with color-coded badge
- Notes section with ability to add new notes
- Status history timeline

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

### 5.3 NDA (Non-Disclosure Agreement) Features

#### 5.3.1 NDA Generation (Admin)

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

#### 5.3.2 NDA Ready Email

| Aspect | Detail |
|--------|--------|
| Trigger | NDA is generated by admin |
| Recipient | Customer's email address |
| Subject | "NDA Ready for Review — {Project Name}" |

**Email Content:**
- Greeting with customer name
- Notification that NDA is ready for review and signature
- CTA button: "Review & Sign NDA" linking to customer portal NDA page

#### 5.3.3 NDA Review & Signing (Customer Portal)

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

#### 5.3.4 NDA Signed Confirmation Emails

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

### 5.4 API Integration Features

#### 5.4.1 Lead Source Tracking

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

#### 5.4.2 External Leads API

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
| Created At | Timestamp | When the lead was created |
| Updated At | Timestamp | When the lead was last modified |

### 7.2 Note Record

| Field | Type | Description |
|-------|------|-------------|
| ID | UUID | Unique identifier |
| Content | Text | Note content |
| Lead ID | UUID | Foreign key to Lead |
| Created At | Timestamp | When the note was created |

### 7.3 Status History Record

| Field | Type | Description |
|-------|------|-------------|
| ID | UUID | Unique identifier |
| From Status | Enum (nullable) | Previous status (null for initial) |
| To Status | Enum | New status |
| Lead ID | UUID | Foreign key to Lead |
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
| Multiple Admin Users | Support for multiple admin accounts with roles | Medium |
| Customer Portal Interactions | Allow customers to add comments/feedback on their project | Medium |
| File Attachments | Allow admin to attach files (proposals, wireframes) to leads | Medium |
| Search & Filter | Search and filter leads on the dashboard | Medium |
| Lead Analytics | Dashboard widgets showing lead statistics and trends | Low |
| Email Templates | Customizable email templates for different scenarios | Low |
| Notification System | In-app notifications for admin on customer activity | Low |

---

## 10. Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | March 5, 2026 | Initial document creation | — |
| 1.1 | March 6, 2026 | Added lead detail view, status tracking, notes system, status update emails | — |
| 1.2 | March 6, 2026 | Added NDA generation, e-signature, PDF download, and signed confirmation emails | — |
| 1.3 | March 6, 2026 | Added external API integration with Bearer token auth, LeadSource tracking (MANUAL/AGENT), API documentation | — |
