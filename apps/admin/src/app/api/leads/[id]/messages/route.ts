import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { logAudit } from "../../../../../lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const messages = await prisma.message.findMany({
    where: { leadId: id },
    orderBy: { createdAt: "asc" },
  });

  // Mark unread customer messages as read
  await prisma.message.updateMany({
    where: { leadId: id, senderType: "customer", readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json(messages);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { projectName: true, customerEmail: true, customerName: true },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const message = await prisma.message.create({
    data: {
      leadId: id,
      content: content.trim(),
      senderName: session.name,
      senderType: "admin",
    },
  });

  logAudit(id, "Message Sent to Customer", content.trim().slice(0, 100), session.name).catch(() => {});

  // Send email notification to customer (non-blocking)
  try {
    const { transporter, getFromAddress } = await import("../../../../../lib/email");
    const portalUrl = `${process.env.CUSTOMER_PORTAL_URL || "https://leadsportal.kitlabs.us"}/project?id=${id}`;
    await transporter.sendMail({
      from: getFromAddress(session.name),
      to: lead.customerEmail,
      subject: `New Message — ${lead.projectName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 20px;">New Message</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">${lead.projectName}</p>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
              <strong>${session.name}</strong> sent you a message:
            </p>
            <div style="background: white; border-left: 4px solid #01358d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${content.trim().slice(0, 500)}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalUrl}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View & Reply</a>
            </div>
          </div>
        </div>
      `,
    });
  } catch (e) {
    console.error("[Message] Failed to notify customer:", e);
  }

  return NextResponse.json(message, { status: 201 });
}
