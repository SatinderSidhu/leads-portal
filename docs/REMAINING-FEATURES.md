# Remaining Features — Email & Sequence System

**Last Updated:** April 10, 2026
**Current Version:** v4.16

This document tracks features that have been identified, discussed, and prioritized but not yet built. It serves as the backlog for future sessions.

---

## What's Already Shipped

| Version | Feature |
|---------|---------|
| v4.11 | Email template type separation (compose vs system) |
| v4.12 | Email templates: body preview, send delay, Nurture/Cold Outreach purposes, clone |
| v4.13 | Smart Sequences: step builder, enrollment, preview, performance |
| v4.14 | Contact Lists: static + dynamic lists, filter rule builder, sequence integration |
| v4.15 | Sequence sending: node-cron, claim-and-lock, crash safety, archival, partial index |
| v4.16 | Phase 2: bounce handling, click tracking, auto-triggers, draft scheduling, heartbeat |

---

## Priority 1 — Should Build Next

### 1. Sender Warm-up Strategy
**Why:** If we switch to AWS SES and immediately blast 10k cold emails, deliverability tanks. Inbox providers judge new senders on early patterns.

**What to build:**
- Per-day send cap that ramps gradually: Day 1 = 50, Day 2 = 100, Day 3 = 200, etc.
- `daily_send_count` tracking (count SentEmail created today)
- Processor refuses to send beyond the daily cap
- Admin-visible "warm-up progress" indicator (e.g., "Day 7 of warm-up: 400/400 sent today")
- Config: ramp schedule stored in env or a `SystemConfig` table

**Effort:** ~1 day
**Depends on:** AWS SES migration (env var switch)

---

### 2. Per-Step Performance Analytics (Open/Click/Reply Rates)
**Why:** The Performance tab on `/sequences/[id]` shows "contacts at each step" but not engagement rates. Admins can't tell which email template is the weakest link.

**What to build:**
- Join `SentEmail` records back to `SequenceStep` via `enrollmentId + enrollmentStep`
- Per-step metrics: sent count, open rate (openedAt not null), click rate (clickedAt not null), reply rate (via ReceivedEmail)
- Display as a table on the Performance tab with progress bars
- Optional: "weakest step" highlight (lowest click rate)

**Effort:** ~half day
**Depends on:** Click tracking (shipped v4.16)

---

### 3. "Run Now" Button on Sequence Detail
**Why:** Currently the only way to manually trigger the processor is `curl` from EC2. No UI option for testing.

**What to build:**
- Button on `/sequences/[id]` page header: "Run Now"
- Calls `POST /api/sequences/process` with session auth (already supported)
- Shows result toast: "Processed 3 enrollments, sent 2, exited 1"
- Disabled when sequence is DRAFT or PAUSED

**Effort:** ~1 hour

---

### 4. Per-Sequence Rate Limits & Send Windows
**Why:** Cold outreach at 3 AM customer-local time gets worse open rates. Also no defense against one runaway sequence consuming the entire SMTP quota.

**What to build:**
- Per-sequence fields: `sendWindowStart`, `sendWindowEnd`, `sendWindowTimezone` (e.g., "09:00", "17:00", "America/New_York")
- Per-sequence: `dailyCap` (max emails per day for this sequence)
- Processor checks: if outside window or over cap, skip and try next tick
- UI: add these fields to the sequence header form

**Effort:** ~1 day

---

### 5. Test Mode / Dry Run for Sequences
**Why:** Building a 6-step sequence with branching is complex. Only way to test is to enroll yourself and wait.

**What to build:**
- "Test Sequence" button on detail page
- Opens a modal: select a test lead (or enter test email)
- Runs the processor in dry-run mode (simulates all steps without SMTP)
- Displays timeline: "Would send 'Welcome' to test@example.com at Day 0, 'Follow-up' at Day 7..."
- No SentEmail records created, no enrollment created

**Effort:** ~1 day

---

## Priority 2 — Build When Needed

### 6. Per-Template Daily Send Cap
**Why:** If a sequence runs away (bug, bad import), one template could blast every contact. No guardrail today.

**What to build:**
- Optional `dailySendCap` field on `EmailTemplate`
- Processor checks `SentEmail` count for that templateId in the last 24 hours before sending
- If over cap: skip and log warning

**Effort:** ~3 hours

---

### 7. Failed-Email Recovery Dashboard
**Why:** When enrollments exit with "Send failed after 5 retries," they're buried in individual sequence contact tabs. No aggregate view.

**What to build:**
- New dashboard section or page: "Failed Sends"
- Shows all enrollments with `status=EXITED AND exitReason LIKE 'Send failed%'`
- Group by sequence, show lead name + email + failure reason + date
- "Retry" button: resets retryCount to 0, sets status=ACTIVE, recalculates nextSendAt

**Effort:** ~3 hours

---

### 8. Lead Detail — Show Archived Enrollments
**Why:** The `SequenceEnrollmentArchive` table exists (rows move there after 90 days), but the UI can't query it. Once archival kicks in, admins lose visibility into historical enrollment data.

**What to build:**
- "Show archived" toggle on the lead detail enrollment history section
- When toggled on: `UNION ALL` query across both tables (or separate tab)
- Read-only display — archived enrollments can't be modified

**Effort:** ~3 hours
**Becomes urgent:** ~90 days after v4.15 shipped (July 2026)

---

### 9. Reply-to Specific Admin (Not Generic Mailbox)
**Why:** All sequence emails reply to `reply+{leadId}@reply.kitlabs.us`. No way to make them reply directly to the assigned admin's inbox.

**What to build:**
- Per-sequence config: `replyToMode` — "system" (default) or "assigned admin"
- If "assigned admin": use the assigned admin's email in the Reply-To header
- Falls back to system address if no admin is assigned

**Effort:** ~2 hours

---

### 10. Sender Identity (Per-Admin From Address)
**Why:** All sequence emails come from `"KITLabs" <leads@kitlabs.us>`. Cold outreach works better when it looks like it came from a real person.

**What to build:**
- Per-sequence config: `senderMode` — "company" (default) or "assigned admin"
- If "assigned admin": use the assigned admin's name in the From display name
- Email still sends from the same SMTP address (SES verified sender), but the display name changes

**Effort:** ~3 hours

---

### 11. Bulk Pause/Resume All Sequences
**Why:** No way to pause all active sequences globally (e.g., holiday, system issue) without going into each one.

**What to build:**
- Admin action: "Pause All Sequences" / "Resume All Sequences"
- Could live on the sequences list page or a settings page
- Toggles `status` on all ACTIVE sequences to PAUSED (and back)
- Confirmation dialog with count of affected sequences + enrolled contacts

**Effort:** ~2 hours

---

## Priority 3 — Future Phase

### 12. Per-Sequence Unsubscribe (Not Global)
**Why:** Some customers want nurture emails to stop but still receive transactional emails. Today unsubscribe is global.

**What to build:**
- New `EnrollmentStatus = OPTED_OUT`
- Per-sequence unsubscribe link in the email footer (alongside the global one)
- Clicking it exits just that sequence, not all communication

**Effort:** ~3 hours

---

### 13. UTM Tagging on Outbound Links
**Why:** Can't track which sequence/step drove a website conversion in Google Analytics.

**What to build:**
- Auto-append `?utm_source=sequence&utm_campaign={sequenceId}&utm_content=step{stepOrder}` to all links during the merge step
- Config: opt-in per sequence (some emails shouldn't have UTM params)

**Effort:** ~3 hours

---

### 14. A/B Testing Within Sequences
**Why:** Can't test whether subject line A or B performs better within the same step.

**What to build:**
- Per-step: option to add 2 template variants with a traffic split (50/50 or configurable)
- Processor randomly assigns variant at send time
- Performance tab shows per-variant open/click/reply rates
- "Winner" selection: manual or automatic (promote the better-performing variant after N sends)

**Effort:** ~3 days
**PRD Status:** Explicitly deferred to v2 in the Smart Sequences PRD

---

### 15. CC/BCC and Attachments on Sequence Emails
**Why:** Sequence templates don't support CC/BCC or file attachments.

**What to build:**
- Add `cc`, `bcc` fields to `SequenceStep` model
- Add `attachmentIds` JSON field (references `LeadFile` or a new `SequenceAttachment` table)
- Processor includes CC/BCC + attachments in the `transporter.sendMail` call

**Effort:** ~1 day

---

### 16. Multi-Channel Sequences (SMS, LinkedIn)
**Why:** Email-only sequences miss contacts who don't check email.

**What to build:**
- New `StepType` enum: EMAIL, SMS, LINKEDIN_MESSAGE
- SMS integration: Twilio or AWS SNS
- LinkedIn: manual reminder step (no API integration — just a "Send LinkedIn message" task created for the admin)

**Effort:** ~3-5 days
**PRD Status:** Explicitly out of scope for v1

---

### 17. AI-Generated Step Suggestions
**Why:** Building a good nurture sequence requires sales expertise. AI could suggest steps based on the goal and audience.

**What to build:**
- "Suggest Steps" button on the sequence builder
- Uses Anthropic Claude API (already integrated for SOW/App Flow generation)
- Input: sequence goal, audience tags, industry
- Output: suggested step list with template subjects, body outlines, and delay recommendations

**Effort:** ~2 days
**PRD Status:** Explicitly deferred to v2

---

## Data Retention Work (Separate PRs)

These are documented in the v4.15 plan and apply to tables other than `SequenceEnrollment` (which already has archival).

| Table | Strategy | Retention | Effort |
|-------|----------|-----------|--------|
| `SentEmail` | Archive table (`sent_emails_archive`) | 1 year | ~half day |
| `ReceivedEmail` | Archive table (`received_emails_archive`) | 1 year | ~half day |
| `AuditLog` | Archive table (`audit_logs_archive`) | 6 months | ~half day |
| `CustomerVisit` | Hard delete (no historical value) | 90 days | ~2 hours |

Each gets its own small PR: new archive model, new cron schedule in `sequence-cron.ts`, migration of old rows.

---

## SQS Migration Triggers

Documented in v4.15 plan. Migrate from PostgreSQL claim-and-lock to AWS SQS when **any** of these become true:

- Sustained volume > 330k emails/month (SQS free tier boundary)
- More than 1 admin container running (horizontal scaling)
- More than 1 producer enqueuing work (currently just the sequence processor)
- Email loss from crashes > once per quarter
- Need exponential-backoff retries with a real DLQ

**Estimated migration effort:** 1 day of work + 1 day of testing. The send logic stays identical; only the "where do I get my next batch from" changes.

---

## AWS SES Migration Checklist

Not started yet. Required before hitting Gmail's daily cap (500 free / 2000 workspace).

1. Verify `kitlabs.us` domain in SES (DKIM + SPF — already done for inbound)
2. Request production access (out of sandbox) — usually approved within 24h
3. Create SMTP credentials via IAM
4. Update GitHub Secrets: `SMTP_HOST=email-smtp.us-east-1.amazonaws.com`, new `SMTP_USER`, `SMTP_PASS`
5. Confirm sending limit is at least 50k/day (request quota increase if needed)
6. Implement sender warm-up (Priority 1 item #1 above) before turning on sequences at scale
7. Configure SES bounce/complaint SNS topics to point at the existing webhook URL (same SNS topic is fine — the webhook now handles all notification types)

**No code changes required** — just env vars. The existing nodemailer transporter works with SES SMTP.
