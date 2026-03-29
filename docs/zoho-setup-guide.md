# Zoho CRM Integration — Setup Guide

This guide walks you through connecting your Zoho CRM account to the Leads Portal so that leads can be synced between both systems.

## Prerequisites

- You must be an **Admin** in your Zoho CRM account
- You need access to the Zoho API Console
- The Leads Portal admin must be deployed and accessible

---

## Step 1: Create a Self Client in Zoho API Console

1. Go to **[https://api-console.zoho.com](https://api-console.zoho.com)**
2. Sign in with the same Zoho account you use for Zoho CRM
3. Click **"Add Client"** (or **"GET STARTED"** if this is your first time)
4. Select **"Self Client"** as the client type
   - Self Client is for server-to-server integrations (no user login popup needed)
5. Click **"CREATE"**
6. You will now see your:
   - **Client ID** (e.g., `1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
   - **Client Secret** (e.g., `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
7. **Copy both values** — you'll need them in the next step

> **Important**: Keep the Client Secret secure. Do not share it publicly.

---

## Step 2: Enter Credentials in Leads Portal

1. Log into the **Admin Portal** (e.g., `https://leadsportaladmin.kitlabs.us`)
2. Click **"Zoho CRM"** in the top navigation bar
3. Under **"Step 1: API Credentials"**:
   - Paste your **Client ID**
   - Paste your **Client Secret**
   - Select your **Data Center** (this depends on your Zoho account region):
     - **United States** — if your Zoho URL is `zoho.com`
     - **Europe** — if your Zoho URL is `zoho.eu`
     - **India** — if your Zoho URL is `zoho.in`
     - **Australia** — if your Zoho URL is `zoho.com.au`
     - **Japan** — if your Zoho URL is `zoho.jp`
     - **Canada** — if your Zoho URL is `zoho.ca`
4. Click **"Save Credentials"**

---

## Step 3: Generate a Grant Token

This is the most time-sensitive step. The grant token expires in a few minutes, so do this quickly.

1. Go back to **[https://api-console.zoho.com](https://api-console.zoho.com)**
2. Click on your **Self Client** that you created in Step 1
3. Click the **"Generate Code"** tab
4. Fill in the form:
   - **Scope**: Copy and paste this exactly:
     ```
     ZohoCRM.modules.leads.ALL,ZohoCRM.coql.READ,ZohoCRM.org.READ
     ```
   - **Time Duration**: Select **10 minutes** (the maximum)
   - **Scope Description**: Enter anything, e.g., `Leads Portal integration`
5. Click **"CREATE"**
6. Zoho will show you a **Grant Token** (a long string)
7. **Copy this token immediately** — it expires in the time you selected

### What the scopes mean:
| Scope | Purpose |
|-------|---------|
| `ZohoCRM.modules.leads.ALL` | Create and read leads in Zoho CRM |
| `ZohoCRM.coql.READ` | Search for existing leads by email |
| `ZohoCRM.org.READ` | Fetch your Zoho organization ID (for generating direct links) |

---

## Step 4: Authorize the Integration

1. Go back to the **Leads Portal → Zoho CRM Settings** page
2. Under **"Step 2: Authorize"**:
   - Paste the **Grant Token** you just generated
3. Click **"Authorize"**
4. If successful, you'll see:
   - **"Zoho authorized successfully!"** message
   - The status will update to show: Credentials = Saved, Authorized = Yes, Status = Enabled
   - An **Org ID** will appear (fetched automatically)

> **If authorization fails**: The most common reason is that the grant token expired. Go back to the Zoho API Console and generate a new one. You have ~10 minutes from generation to paste it.

---

## Step 5: Test the Connection

1. Click **"Test Connection"** on the Zoho CRM Settings page
2. If everything is working, you'll see **"Connection successful!"** and your Org ID

---

## Step 6: Start Using the Integration

Once authorized and enabled, the integration works as follows:

### Creating New Leads
- When you create a new lead at `/leads/new`, you'll see a checkbox: **"Also create in Zoho CRM"**
- This checkbox is **checked by default** when Zoho is enabled
- Uncheck it if you don't want a particular lead to go to Zoho
- The lead is created in the Leads Portal first, then synced to Zoho

### Existing Leads
- Open any lead's detail page (`/leads/[id]`)
- You'll see a Zoho CRM status banner:
  - **"Available in Zoho CRM"** with a **"View in Zoho"** link — if the lead is already in Zoho
  - **"Not in Zoho CRM"** with a **"Create in Zoho"** button — if the lead hasn't been synced yet
- The system automatically searches Zoho by the customer's email address when you open a lead

### Field Mapping
When a lead is created in Zoho, these fields are mapped:

| Leads Portal Field | Zoho CRM Field |
|---|---|
| Customer Name | First Name + Last Name |
| Customer Email | Email |
| Project Name | Company |
| Phone | Phone |
| City | City |
| Zip Code | Zip Code |
| Project Description | Description |
| Source (Manual/Bark) | Lead Source (Web Form / External Referral) |

---

## Troubleshooting

### "Grant token expired" error
- Grant tokens are one-time use and expire quickly (3-10 minutes)
- Generate a new one from the Zoho API Console and paste it immediately

### "Zoho OAuth error: invalid_code"
- The grant token has already been used or expired
- Generate a fresh one from the Zoho API Console

### "Zoho token refresh failed"
- The refresh token may have been revoked
- This can happen if:
  - You deleted the Self Client in Zoho API Console
  - The refresh token wasn't used for 6+ months
  - You regenerated credentials in the API Console
- **Fix**: Generate a new grant token and re-authorize

### "Could not fetch Zoho org ID"
- Make sure the scope `ZohoCRM.org.READ` was included when generating the grant token
- If not, generate a new grant token with the correct scopes

### Lead not showing in Zoho
- Check that the integration is **Enabled** (toggle on the settings page)
- Check that the "Also create in Zoho CRM" checkbox was selected
- The Zoho CRM might take a few seconds to index the new lead

### Duplicate leads in Zoho
- The integration maps by email address
- If a lead with the same email already exists in Zoho, the system will link to it instead of creating a duplicate

---

## Disabling the Integration

- Go to **Zoho CRM Settings** in the admin portal
- Toggle the **Enable/Disable** switch off
- When disabled:
  - The "Also create in Zoho" checkbox won't appear on new leads
  - The Zoho status banner won't appear on lead detail pages
  - No API calls will be made to Zoho

## Re-authorizing

If you need to re-authorize (e.g., changed Zoho account, revoked tokens):

1. Go to **Zoho CRM Settings**
2. Enter new **Client ID** and **Client Secret** (if changed)
3. Generate a new **Grant Token** from the Zoho API Console
4. Click **"Authorize"** with the new grant token
5. Click **"Test Connection"** to verify

---

## Security Notes

- **Client Secret** and **Refresh Token** are stored in the database (not in environment variables), so they can be updated without redeployment
- The **Client Secret** is masked in the settings page UI (only first 8 characters shown)
- **Access tokens** expire every hour and are refreshed automatically
- All Zoho API calls are made server-side — credentials are never exposed to the browser
- The Self Client approach means no user login popup — the server handles everything
