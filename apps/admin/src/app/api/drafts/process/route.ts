import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { mergeTags } from "../../../../lib/template-merge";
import { rewriteLinksForTracking } from "../../../../lib/click-track-utils";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const BATCH_SIZE = 20;
const LOCK_DURATION_MS = 5 * 60 * 1000;
const MAX_RETRIES = 5;
const RETRY_BACKOFF_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  // Auth via CRON_SECRET or admin session
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const { getAdminSession } = await import("../../../../lib/session");
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Claim scheduled drafts that are due
    const drafts = await prisma.emailDraft.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: now },
        OR: [
          { lockedUntil: null },
          { lockedUntil: { lt: now } },
        ],
        retryCount: { lt: MAX_RETRIES },
      },
      include: {
        lead: {
          select: {
            id: true, customerName: true, customerEmail: true, projectName: true,
            doNotContact: true, phone: true, city: true, status: true, stage: true,
            source: true, dateCreated: true, companyName: true, jobTitle: true,
          },
        },
      },
      take: BATCH_SIZE,
      orderBy: { scheduledAt: "asc" },
    });

    if (drafts.length === 0) {
      return NextResponse.json({ claimed: 0, sent: 0, skipped: 0 });
    }

    // Lock them
    const lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    await prisma.emailDraft.updateMany({
      where: { id: { in: drafts.map((d) => d.id) } },
      data: { lockedUntil: lockUntil },
    });

    let sent = 0;
    let skipped = 0;

    for (const draft of drafts) {
      const { lead } = draft;

      // Check DNC
      if (lead.doNotContact) {
        await prisma.emailDraft.update({
          where: { id: draft.id },
          data: { status: "CANCELLED", lockedUntil: null, failureReason: "Do Not Contact enabled" },
        });
        skipped++;
        continue;
      }

      // Merge tags in subject and body
      const subject = mergeTags(draft.subject, lead);
      const body = mergeTags(draft.body, lead);

      try {
        // Create SentEmail record
        const sentEmail = await prisma.sentEmail.create({
          data: {
            leadId: lead.id,
            subject,
            body,
            sentBy: draft.createdBy || "Scheduled Draft",
            cc: draft.cc,
            bcc: draft.bcc,
            status: "SENT",
          },
        });

        // Send with tracking
        const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "https://leadsportaladmin.kitlabs.us";
        const trackingPixel = `<img src="${adminUrl}/api/track/${sentEmail.id}" width="1" height="1" style="display:none" />`;
        const clickTrackedBody = rewriteLinksForTracking(body, sentEmail.id, adminUrl);

        await transporter.sendMail({
          from: `"KITLabs" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: lead.customerEmail,
          subject,
          html: clickTrackedBody + trackingPixel,
          ...(draft.cc ? { cc: draft.cc } : {}),
          ...(draft.bcc ? { bcc: draft.bcc } : {}),
        });

        // Mark draft as sent
        await prisma.emailDraft.update({
          where: { id: draft.id },
          data: { status: "SENT", sentAt: now, sentEmailId: sentEmail.id, lockedUntil: null, retryCount: 0 },
        });

        sent++;
      } catch (emailError) {
        console.error(`[draft-processor] SMTP failed for draft ${draft.id}:`, emailError);

        const errMsg = emailError instanceof Error ? emailError.message : String(emailError);
        const newRetryCount = draft.retryCount + 1;

        if (newRetryCount >= MAX_RETRIES) {
          await prisma.emailDraft.update({
            where: { id: draft.id },
            data: {
              status: "FAILED",
              failureReason: `Send failed after ${MAX_RETRIES} retries: ${errMsg}`,
              lockedUntil: null,
              retryCount: newRetryCount,
            },
          });
        } else {
          await prisma.emailDraft.update({
            where: { id: draft.id },
            data: {
              scheduledAt: new Date(Date.now() + RETRY_BACKOFF_MS),
              lockedUntil: null,
              retryCount: newRetryCount,
            },
          });
        }
        skipped++;
      }

      // Pacing
      await new Promise((r) => setTimeout(r, 80));
    }

    return NextResponse.json({ claimed: drafts.length, sent, skipped });
  } catch (error) {
    console.error("[draft-processor] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
