import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/session";
import nodemailer from "nodemailer";
import { writeFile } from "fs/promises";
import path from "path";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const leadId = formData.get("leadId") as string;
  const message = formData.get("message") as string;
  const file = formData.get("file") as File | null;

  if (!leadId || !message?.trim()) {
    return NextResponse.json({ error: "leadId and message are required" }, { status: 400 });
  }

  if (!(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      projectName: true,
      customerName: true,
      assignedTo: { select: { id: true, email: true, name: true } },
      watchers: { include: { admin: { select: { id: true, email: true } } } },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Handle file upload if provided
  let uploadedFilePath: string | null = null;
  let uploadedFileName: string | null = null;
  if (file && file.size > 0) {
    const ext = path.extname(file.name).toLowerCase();
    if (![".pdf", ".doc", ".docx"].includes(ext)) {
      return NextResponse.json({ error: "Only PDF and Word files are allowed" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
    }

    const filename = `nda-request-${leadId}-${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "nda-requests");
    const { mkdir } = await import("fs/promises");
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    uploadedFilePath = `/uploads/nda-requests/${filename}`;
    uploadedFileName = file.name;
  }

  // Log to audit trail
  const detail = uploadedFileName
    ? `${session.name} requested an NDA and attached "${uploadedFileName}"`
    : `${session.name} requested an NDA`;
  await prisma.auditLog.create({
    data: {
      leadId,
      action: "NDA Requested by Customer",
      detail,
      actor: `${session.name} (Customer)`,
    },
  }).catch(() => {});

  // Also log as a note so admin sees it in the lead detail
  await prisma.note.create({
    data: {
      leadId,
      content: `[NDA Request] ${message.trim()}${uploadedFileName ? `\n\nAttached file: ${uploadedFileName}` : ""}`,
      createdBy: `${session.name} (Customer)`,
    },
  }).catch(() => {});

  // Email assigned admin + watchers
  try {
    const emails = new Set<string>();
    if (lead.assignedTo) emails.add(lead.assignedTo.email);
    for (const w of lead.watchers) emails.add(w.admin.email);

    if (emails.size > 0) {
      const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
      const emailList = Array.from(emails);

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@leadsportal.com",
        to: emailList[0],
        ...(emailList.length > 1 && { bcc: emailList.slice(1).join(",") }),
        subject: `NDA Request: ${lead.projectName} — ${lead.customerName}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 20px;">NDA Request</h1>
              <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">${lead.projectName}</p>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
                <strong>${lead.customerName}</strong> has requested an NDA for this project.
              </p>
              <div style="background: white; border-left: 4px solid #f9556d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message.trim()}</p>
              </div>
              ${uploadedFileName ? `<p style="color: #666; font-size: 14px; margin-top: 16px;">📎 Attached file: <strong>${uploadedFileName}</strong></p>` : ""}
              <div style="text-align: center; margin: 30px 0;">
                <a href="${adminUrl}/leads/${leadId}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View Lead & Send NDA</a>
              </div>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center;">This is an automated notification from the Customer Portal.</p>
          </div>
        `,
      });
    }
  } catch (e) {
    console.error("[NDA Request] Failed to notify admin:", e);
  }

  return NextResponse.json({ success: true });
}
