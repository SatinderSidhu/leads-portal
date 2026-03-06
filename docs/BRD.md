# Business Requirements Document (BRD)

## Leads Portal — Lead Management System for Mobile Apps & Web Platforms

| Field | Detail |
|-------|--------|
| Document Version | 1.0 |
| Last Updated | March 5, 2026 |
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

---

## 3. Stakeholders

| Role | Description |
|------|-------------|
| Admin | Internal team member responsible for entering and managing leads |
| Customer | External client who has been entered as a lead |

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
| Project Description | Full description of the project |
| Customer Email | Shown for reference |

**Error States:**

| Scenario | Display |
|----------|---------|
| No ID in URL | "No Project ID Provided" message with instructions |
| Invalid/unknown ID | "Project Not Found" message |

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

### 6.3 Customer Portal Access Flow

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
| Email Sent | Boolean | Whether the welcome email was sent |
| Created At | Timestamp | When the lead was created |
| Updated At | Timestamp | When the lead was last modified |

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
| Lead Status Tracking | Add status field (New, In Progress, Converted, Lost) | High |
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
