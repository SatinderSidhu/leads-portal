import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { calculateNextSendAt, checkStepCondition } from "../../../../lib/sequence-utils";
import { mergeTags } from "../../../../lib/template-merge";
import { rewriteLinksForTracking } from "../../../../lib/click-track-utils";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const BATCH_SIZE = 50;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const SEND_PACING_MS = 80; // ~14/sec — under SES sustained rate
const MAX_RETRIES = 5;
const RETRY_BACKOFF_MS = 10 * 60 * 1000; // 10 minutes

function isDuplicateKeyError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

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

    // ── Phase 1: Atomically claim a batch of enrollments ──
    const enrollments = await prisma.$transaction(async (tx) => {
      const claimed = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM sequence_enrollments
        WHERE status = 'ACTIVE'
          AND next_send_at <= ${now}
          AND (locked_until IS NULL OR locked_until < ${now})
          AND retry_count < ${MAX_RETRIES}
        ORDER BY next_send_at ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      `;

      if (claimed.length === 0) return [];

      const lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      const claimedIds = claimed.map((c) => c.id);

      await tx.sequenceEnrollment.updateMany({
        where: { id: { in: claimedIds } },
        data: { lockedUntil: lockUntil },
      });

      return tx.sequenceEnrollment.findMany({
        where: { id: { in: claimedIds } },
        include: {
          lead: {
            select: {
              id: true,
              customerName: true,
              customerEmail: true,
              projectName: true,
              doNotContact: true,
              phone: true,
              city: true,
              status: true,
              stage: true,
              source: true,
              dateCreated: true,
              companyName: true,
              jobTitle: true,
            },
          },
          sequence: {
            include: {
              steps: { orderBy: { stepOrder: "asc" }, include: { template: true } },
            },
          },
        },
      });
    });

    let sent = 0;
    let skipped = 0;
    let exited = 0;

    // ── Phase 2: Process each claimed enrollment ──
    for (const enrollment of enrollments) {
      const { lead, sequence } = enrollment;

      // Check doNotContact
      if (lead.doNotContact) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "EXITED",
            exitReason: "Do Not Contact enabled",
            nextSendAt: null,
            lockedUntil: null,
          },
        });
        exited++;
        continue;
      }

      // Check sequence is still active. If the parent sequence is DRAFT or
      // PAUSED, park the enrollment as PAUSED with a null nextSendAt so it
      // stops being re-claimed every tick — otherwise the SELECT FOR UPDATE
      // claim above keeps hitting the same poison-pill rows (status=ACTIVE,
      // nextSendAt<=now) and blocks the entire queue behind them. Resuming
      // the parent sequence is a separate admin action; PAUSED enrollments
      // can be flipped back to ACTIVE explicitly.
      if (sequence.status !== "ACTIVE") {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "PAUSED",
            nextSendAt: null,
            lockedUntil: null,
            exitReason: `Parent sequence is ${sequence.status}`,
          },
        });
        skipped++;
        continue;
      }

      // Check sequence-level exit conditions
      const exitConditions = sequence.exitConditions as string[];
      if (exitConditions?.includes("REPLIED")) {
        const recentReply = await prisma.receivedEmail.findFirst({
          where: { leadId: lead.id, receivedAt: { gte: enrollment.enrolledAt } },
        });
        if (recentReply) {
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              status: "EXITED",
              exitReason: "Contact replied",
              nextSendAt: null,
              lockedUntil: null,
            },
          });
          exited++;
          continue;
        }
      }

      // Find current step
      const currentStep = sequence.steps.find(
        (s) => s.stepOrder === enrollment.currentStepOrder
      );
      if (!currentStep) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "COMPLETED", nextSendAt: null, lockedUntil: null },
        });
        exited++;
        continue;
      }

      // Check step-level branching condition
      if (!checkStepCondition(currentStep.condition, enrollment.lastAction)) {
        // Condition not met — skip to goToStepOrder if configured, otherwise just skip
        if (currentStep.goToStepOrder) {
          const targetStep = sequence.steps.find(
            (s) => s.stepOrder === currentStep.goToStepOrder
          );
          if (targetStep) {
            await prisma.sequenceEnrollment.update({
              where: { id: enrollment.id },
              data: {
                currentStepOrder: targetStep.stepOrder,
                nextSendAt: calculateNextSendAt(targetStep.waitValue, targetStep.waitUnit),
                lockedUntil: null,
              },
            });
          } else {
            await prisma.sequenceEnrollment.update({
              where: { id: enrollment.id },
              data: { lockedUntil: null },
            });
          }
        } else {
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { lockedUntil: null },
          });
        }
        skipped++;
        continue;
      }

      // Check step-level exit condition
      if (
        currentStep.exitOnCondition &&
        checkStepCondition(currentStep.exitOnCondition, enrollment.lastAction)
      ) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "EXITED",
            exitReason: `Step ${currentStep.stepOrder} exit condition met`,
            nextSendAt: null,
            lockedUntil: null,
          },
        });
        exited++;
        continue;
      }

      // ── Phase 3: Crash-safe send pipeline ──
      const template = currentStep.template;
      const stepOrderBeforeSend = enrollment.currentStepOrder;
      const nextStepOrder = stepOrderBeforeSend + 1;
      const nextStep = sequence.steps.find((s) => s.stepOrder === nextStepOrder);

      // Merge tags
      const emailSubject = mergeTags(template.subject, lead);
      const emailBody = mergeTags(template.body, lead);

      // STEP 1: Reserve idempotency slot (durable record before SMTP)
      let sentEmailId: string;
      try {
        const sentEmail = await prisma.sentEmail.create({
          data: {
            leadId: lead.id,
            templateId: template.id,
            enrollmentId: enrollment.id,
            enrollmentStep: stepOrderBeforeSend,
            subject: emailSubject,
            body: emailBody,
            sentBy: "Smart Sequence",
            status: "SENT",
          },
        });
        sentEmailId = sentEmail.id;
      } catch (e) {
        if (isDuplicateKeyError(e)) {
          // Already sent in a previous tick — advance and move on
          console.warn(
            `[seq-cron] enrollment ${enrollment.id} step ${stepOrderBeforeSend} already sent — advancing`
          );
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              currentStepOrder: nextStepOrder,
              status: nextStep ? "ACTIVE" : "COMPLETED",
              nextSendAt: nextStep
                ? calculateNextSendAt(nextStep.waitValue, nextStep.waitUnit, now)
                : null,
              lockedUntil: null,
              retryCount: 0,
            },
          });
          continue;
        }
        // Unknown DB error — release lock and let next tick retry
        console.error(
          `[seq-cron] DB error reserving slot for enrollment ${enrollment.id}:`,
          e
        );
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { lockedUntil: null },
        });
        skipped++;
        continue;
      }

      // STEP 2: Advance enrollment optimistically (before SMTP)
      // Crash here = missed send, never duplicate.
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStepOrder: nextStepOrder,
          lastEmailSentAt: now,
          lastAction: "NONE",
          status: nextStep ? "ACTIVE" : "COMPLETED",
          nextSendAt: nextStep
            ? calculateNextSendAt(nextStep.waitValue, nextStep.waitUnit, now)
            : null,
          exitReason: nextStep ? null : "Completed all steps",
          lockedUntil: null,
          retryCount: 0,
        },
      });

      // STEP 3: Actually send the email
      try {
        const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "https://leadsportaladmin.kitlabs.us";
        const trackingPixel = `<img src="${adminUrl}/api/track/${sentEmailId}" width="1" height="1" style="display:none" />`;
        const clickTrackedBody = rewriteLinksForTracking(emailBody, sentEmailId, adminUrl);
        await transporter.sendMail({
          from: `"KITLabs" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: lead.customerEmail,
          subject: emailSubject,
          html: clickTrackedBody + trackingPixel,
        });
        sent++;
      } catch (emailError) {
        // STEP 4: SMTP failed — roll back and increment retry counter
        console.error(
          `[seq-cron] SMTP failed for enrollment ${enrollment.id}:`,
          emailError
        );

        // Mark SentEmail as FAILED before deleting (audit trail in logs)
        const errMsg =
          emailError instanceof Error ? emailError.message : String(emailError);

        const newRetryCount = enrollment.retryCount + 1;
        if (newRetryCount >= MAX_RETRIES) {
          // Give up
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              status: "EXITED",
              exitReason: `Send failed after ${MAX_RETRIES} retries: ${errMsg}`,
              nextSendAt: null,
              lockedUntil: null,
              retryCount: newRetryCount,
            },
          });
          // Mark the SentEmail as FAILED so it stays in history as a failed attempt
          await prisma.sentEmail.update({
            where: { id: sentEmailId },
            data: { status: "FAILED" },
          });
          exited++;
        } else {
          // Roll back step advancement, schedule retry in 10 minutes
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              currentStepOrder: stepOrderBeforeSend,
              status: "ACTIVE",
              nextSendAt: new Date(Date.now() + RETRY_BACKOFF_MS),
              lockedUntil: null,
              retryCount: newRetryCount,
            },
          });
          // Delete the SentEmail row so the unique constraint doesn't block the retry
          await prisma.sentEmail.delete({ where: { id: sentEmailId } });
          skipped++;
        }
        continue;
      }

      // Pace at ~14/sec to stay under SES sustained limit
      await new Promise((r) => setTimeout(r, SEND_PACING_MS));
    }

    return NextResponse.json({
      claimed: enrollments.length,
      sent,
      skipped,
      exited,
    });
  } catch (error) {
    console.error("Sequence processor error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
