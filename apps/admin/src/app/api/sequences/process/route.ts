import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { calculateNextSendAt, checkStepCondition } from "../../../../lib/sequence-utils";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function POST(req: Request) {
  // Auth via CRON_SECRET or admin session
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Fall back to session auth for manual triggers
    const { getAdminSession } = await import("../../../../lib/session");
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find enrollments ready to process
    const enrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        status: "ACTIVE",
        nextSendAt: { lte: now },
      },
      include: {
        lead: { select: { id: true, customerName: true, customerEmail: true, projectName: true, doNotContact: true } },
        sequence: {
          include: {
            steps: { orderBy: { stepOrder: "asc" }, include: { template: true } },
          },
        },
      },
      take: 50, // Process in batches
    });

    let sent = 0;
    let skipped = 0;
    let exited = 0;

    for (const enrollment of enrollments) {
      const { lead, sequence } = enrollment;

      // Check doNotContact
      if (lead.doNotContact) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "EXITED", exitReason: "Do Not Contact enabled", nextSendAt: null },
        });
        exited++;
        continue;
      }

      // Check sequence is still active
      if (sequence.status !== "ACTIVE") {
        skipped++;
        continue;
      }

      // Check exit conditions (e.g., REPLIED)
      const exitConditions = sequence.exitConditions as string[];
      if (exitConditions.includes("REPLIED")) {
        const recentReply = await prisma.receivedEmail.findFirst({
          where: { leadId: lead.id, receivedAt: { gte: enrollment.enrolledAt } },
        });
        if (recentReply) {
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { status: "EXITED", exitReason: "Contact replied", nextSendAt: null },
          });
          exited++;
          continue;
        }
      }
      if (exitConditions.includes("UNSUBSCRIBED") && lead.doNotContact) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "EXITED", exitReason: "Contact unsubscribed", nextSendAt: null },
        });
        exited++;
        continue;
      }

      // Find current step
      const currentStep = sequence.steps.find((s) => s.stepOrder === enrollment.currentStepOrder);
      if (!currentStep) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "COMPLETED", nextSendAt: null },
        });
        exited++;
        continue;
      }

      // Check step condition
      if (!checkStepCondition(currentStep.condition, enrollment.lastAction)) {
        // Condition not met — check if there's a goToStepOrder
        if (currentStep.goToStepOrder) {
          const nextStep = sequence.steps.find((s) => s.stepOrder === currentStep.goToStepOrder);
          if (nextStep) {
            await prisma.sequenceEnrollment.update({
              where: { id: enrollment.id },
              data: {
                currentStepOrder: nextStep.stepOrder,
                nextSendAt: calculateNextSendAt(nextStep.waitValue, nextStep.waitUnit),
              },
            });
          }
        }
        skipped++;
        continue;
      }

      // Check step-level exit condition
      if (currentStep.exitOnCondition && checkStepCondition(currentStep.exitOnCondition, enrollment.lastAction)) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "EXITED", exitReason: `Step ${currentStep.stepOrder} exit condition met`, nextSendAt: null },
        });
        exited++;
        continue;
      }

      // Send the email
      const template = currentStep.template;
      let emailBody = template.body;
      let emailSubject = template.subject;

      // Merge tags
      const replacements: Record<string, string> = {
        customerName: lead.customerName,
        projectName: lead.projectName,
      };
      for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        emailBody = emailBody.replace(regex, value);
        emailSubject = emailSubject.replace(regex, value);
      }

      try {
        // Create SentEmail record first for tracking pixel
        const sentEmail = await prisma.sentEmail.create({
          data: {
            leadId: lead.id,
            subject: emailSubject,
            body: emailBody,
            sentBy: "Smart Sequence",
            templateId: template.id,
            status: "SENT",
          },
        });

        const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_ADMIN_URL || "https://leadsportaladmin.kitlabs.us"}/api/track/${sentEmail.id}" width="1" height="1" style="display:none" />`;

        await transporter.sendMail({
          from: `"KITLabs" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: lead.customerEmail,
          subject: emailSubject,
          html: emailBody + trackingPixel,
        });

        sent++;
      } catch (emailError) {
        console.error(`Failed to send sequence email to ${lead.customerEmail}:`, emailError);
        skipped++;
        continue;
      }

      // Advance to next step
      const nextStepOrder = enrollment.currentStepOrder + 1;
      const nextStep = sequence.steps.find((s) => s.stepOrder === nextStepOrder);

      if (nextStep) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            currentStepOrder: nextStepOrder,
            lastEmailSentAt: now,
            lastAction: "NONE", // Reset for next step's condition check
            nextSendAt: calculateNextSendAt(nextStep.waitValue, nextStep.waitUnit, now),
          },
        });
      } else {
        // Last step completed
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            lastEmailSentAt: now,
            status: "COMPLETED",
            nextSendAt: null,
            exitReason: "Completed all steps",
          },
        });
      }
    }

    return NextResponse.json({ processed: enrollments.length, sent, skipped, exited });
  } catch (error) {
    console.error("Sequence processor error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
