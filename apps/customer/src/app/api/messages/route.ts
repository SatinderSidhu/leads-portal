import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../lib/session";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function GET(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  if (!leadId || !(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { leadId },
    orderBy: { createdAt: "asc" },
  });

  // Mark unread admin messages as read
  await prisma.message.updateMany({
    where: { leadId, senderType: "admin", readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId, content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });
  if (!leadId || !(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      projectName: true,
      assignedTo: { select: { email: true } },
      watchers: { include: { admin: { select: { email: true } } } },
    },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const message = await prisma.message.create({
    data: {
      leadId,
      content: content.trim(),
      senderName: session.name,
      senderType: "customer",
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      leadId,
      action: "Customer Message Received",
      detail: content.trim().slice(0, 100),
      actor: `${session.name} (Customer)`,
    },
  }).catch(() => {});

  // Notify admin watchers + assigned (non-blocking)
  try {
    const emails = new Set<string>();
    for (const w of lead.watchers) emails.add(w.admin.email);
    if (lead.assignedTo) emails.add(lead.assignedTo.email);
    if (emails.size === 0) return NextResponse.json(message, { status: 201 });

    // Check notification preferences
    const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
    const emailList = Array.from(emails);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@leadsportal.com",
      to: emailList[0],
      ...(emailList.length > 1 && { bcc: emailList.slice(1).join(",") }),
      subject: `New Message from ${session.name} — ${lead.projectName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 20px;">New Customer Message</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">${lead.projectName}</p>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
              <strong>${session.name}</strong> sent a message:
            </p>
            <div style="background: white; border-left: 4px solid #f9556d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${content.trim().slice(0, 500)}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${adminUrl}/leads/${leadId}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View & Reply</a>
            </div>
          </div>
        </div>
      `,
    });
  } catch (e) {
    console.error("[Message] Failed to notify admin:", e);
  }

  return NextResponse.json(message, { status: 201 });
}
