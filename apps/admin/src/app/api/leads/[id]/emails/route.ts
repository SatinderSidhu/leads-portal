import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { transporter, getReplyToAddress } from "../../../../../lib/email";
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
    select: { customerEmail: true, customerName: true },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
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

  // Append signature if requested
  let finalBody = emailBody.trim();
  if (includeSignature && session?.emailSignature) {
    finalBody += `<hr style="border:none;border-top:1px solid #eee;margin:20px 0" />${session.emailSignature}`;
  }

  // Inject tracking pixel
  const trackingUrl = `${process.env.ADMIN_PORTAL_URL || "http://localhost:3000"}/api/track/${sentEmail.id}`;
  const bodyWithPixel = `${finalBody}<img src="${trackingUrl}" width="1" height="1" style="display:none" alt="" />`;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@leadsportal.com",
      replyTo: getReplyToAddress(id),
      to: lead.customerEmail,
      cc: cc?.trim() || undefined,
      bcc: bcc?.trim() || undefined,
      subject: subject.trim(),
      html: bodyWithPixel,
      attachments: savedAttachments.map((a) => ({
        filename: a.fileName,
        path: path.join(process.cwd(), "public", a.filePath),
      })),
    });

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
