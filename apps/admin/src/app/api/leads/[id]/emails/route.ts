import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { transporter, getFromAddress, getReplyToAddress } from "../../../../../lib/email";
import { sendNotification } from "../../../../../lib/notify";
import { logAudit } from "../../../../../lib/audit";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_ATTACHMENTS = 25 * 1024 * 1024; // 25MB total (Gmail limit)

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [sent, received] = await Promise.all([
    prisma.sentEmail.findMany({
      where: { leadId: id },
      include: {
        template: { select: { title: true, purpose: true } },
        attachments: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.receivedEmail.findMany({
      where: { leadId: id },
      orderBy: { receivedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ sent, received });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const subject = formData.get("subject") as string | null;
  const emailBody = formData.get("body") as string | null;
  const templateId = formData.get("templateId") as string | null;
  const includeSignature = formData.get("includeSignature") === "true";
  const cc = formData.get("cc") as string | null;
  const bcc = formData.get("bcc") as string | null;
  const replyToEmailId = formData.get("replyToEmailId") as string | null;
  const replyToType = formData.get("replyToType") as string | null;
  const attachmentFiles = formData.getAll("attachments") as File[];

  if (!subject?.trim() || !emailBody?.trim()) {
    return NextResponse.json(
      { error: "Subject and body are required" },
      { status: 400 }
    );
  }

  // Validate attachment sizes
  let totalSize = 0;
  for (const file of attachmentFiles) {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json(
        { error: `Attachment "${file.name}" exceeds 10MB limit` },
        { status: 400 }
      );
    }
    totalSize += file.size;
  }
  if (totalSize > MAX_TOTAL_ATTACHMENTS) {
    return NextResponse.json(
      { error: "Total attachments exceed 25MB limit" },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: {
      customerEmail: true, customerName: true, projectName: true,
      phone: true, city: true, status: true, stage: true, source: true, dateCreated: true,
      doNotContact: true,
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.doNotContact) {
    return NextResponse.json(
      { error: "Cannot send email — Do Not Contact is enabled for this lead. Disable it first." },
      { status: 403 }
    );
  }

  const session = await getAdminSession();

  // Save attachments to disk
  const savedAttachments: { fileName: string; filePath: string; fileSize: number; fileType: string }[] = [];
  if (attachmentFiles.length > 0) {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "emails");
    await mkdir(uploadDir, { recursive: true });

    for (const file of attachmentFiles) {
      const ext = path.extname(file.name) || "";
      const filename = `${randomUUID()}${ext}`;
      const bytes = await file.arrayBuffer();
      await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));
      savedAttachments.push({
        fileName: file.name,
        filePath: `/uploads/emails/${filename}`,
        fileSize: file.size,
        fileType: file.type,
      });
    }
  }

  // Create sent email record
  const sentEmail = await prisma.sentEmail.create({
    data: {
      leadId: id,
      templateId: templateId || null,
      subject: subject.trim(),
      body: emailBody.trim(),
      sentBy: session?.name || "Unknown",
      cc: cc?.trim() || null,
      bcc: bcc?.trim() || null,
      replyToEmailId: replyToEmailId || null,
      replyToType: replyToType || null,
      attachments: savedAttachments.length > 0 ? {
        create: savedAttachments,
      } : undefined,
    },
    include: { attachments: true },
  });

  // Replace template tags with actual lead values
  const STATUS_LABELS: Record<string, string> = {
    NEW: "New", SOW_READY: "SOW Ready", DESIGN_READY: "Design Ready",
    DESIGN_APPROVED: "Design Approved", BUILD_IN_PROGRESS: "Build In Progress",
    BUILD_READY_FOR_REVIEW: "Build Ready for Review", BUILD_SUBMITTED: "Build Submitted", GO_LIVE: "Go Live",
  };
  const STAGE_LABELS: Record<string, string> = {
    COLD: "Cold", WARM: "Warm", HOT: "Hot", ACTIVE: "Active", CLOSED: "Closed",
  };
  const dateLabel = lead.dateCreated
    ? new Date(lead.dateCreated).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";
  const mergeTemplateTags = (text: string) =>
    text
      .replace(/\{\{customerName\}\}/g, lead.customerName)
      .replace(/\{\{projectName\}\}/g, lead.projectName || "")
      .replace(/\{\{customerEmail\}\}/g, lead.customerEmail)
      .replace(/\{\{customerPhone\}\}/g, lead.phone || "")
      .replace(/\{\{customerCity\}\}/g, lead.city || "")
      .replace(/\{\{status\}\}/g, STATUS_LABELS[lead.status] || lead.status)
      .replace(/\{\{stage\}\}/g, STAGE_LABELS[lead.stage] || lead.stage)
      .replace(/\{\{source\}\}/g, lead.source || "")
      .replace(/\{\{dateCreated\}\}/g, dateLabel);

  // Append signature if requested
  let finalBody = mergeTemplateTags(emailBody.trim());
  if (includeSignature && session?.emailSignature) {
    finalBody += `<hr style="border:none;border-top:1px solid #eee;margin:20px 0" />${session.emailSignature}`;
  }

  // Convert relative /uploads/ paths to absolute URLs so images render in email clients
  const baseUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
  finalBody = finalBody.replace(/(src=["'])\/uploads\//g, `$1${baseUrl}/uploads/`);

  // Inject tracking pixel
  const trackingUrl = `${baseUrl}/api/track/${sentEmail.id}`;
  const bodyWithPixel = `${finalBody}<img src="${trackingUrl}" width="1" height="1" style="display:none" alt="" />`;

  try {
    await transporter.sendMail({
      from: getFromAddress(session?.name),
      replyTo: getReplyToAddress(id, session?.name),
      to: lead.customerEmail,
      cc: cc?.trim() || undefined,
      bcc: bcc?.trim() || undefined,
      subject: mergeTemplateTags(subject.trim()),
      html: bodyWithPixel,
      attachments: savedAttachments.map((a) => ({
        filename: a.fileName,
        path: path.join(process.cwd(), "public", a.filePath),
      })),
    });

    // Notify watchers about email sent (non-blocking)
    sendNotification({
      event: "email_sent_to_customer",
      leadId: id,
      subject: `Email Sent: ${subject.trim()} — ${lead.projectName}`,
      body: `
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
          <strong>${session?.name || "Admin"}</strong> sent an email to <strong>${lead.customerName}</strong>.
        </p>
        <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e5e7eb;">
          <p style="margin: 4px 0; font-size: 14px;"><strong>Subject:</strong> ${subject.trim()}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>To:</strong> ${lead.customerEmail}</p>
        </div>
      `,
      excludeAdminId: session?.id,
    }).catch(() => {});

    logAudit(id, "Email Sent", `Subject: ${subject.trim()}, To: ${lead.customerEmail}`, session?.name).catch(() => {});

    return NextResponse.json(sentEmail);
  } catch {
    await prisma.sentEmail.update({
      where: { id: sentEmail.id },
      data: { status: "FAILED" },
    });

    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
