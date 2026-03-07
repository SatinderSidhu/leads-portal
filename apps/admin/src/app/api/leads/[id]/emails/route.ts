import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { transporter } from "../../../../../lib/email";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const emails = await prisma.sentEmail.findMany({
    where: { leadId: id },
    include: { template: { select: { title: true, purpose: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(emails);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { subject, body: emailBody, templateId } = body as {
    subject?: string;
    body?: string;
    templateId?: string;
  };

  if (!subject?.trim() || !emailBody?.trim()) {
    return NextResponse.json(
      { error: "Subject and body are required" },
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

  // Create sent email record first to get tracking ID
  const sentEmail = await prisma.sentEmail.create({
    data: {
      leadId: id,
      templateId: templateId || null,
      subject: subject.trim(),
      body: emailBody.trim(),
      sentBy: session?.name || "Unknown",
    },
  });

  // Inject tracking pixel
  const trackingUrl = `${process.env.ADMIN_PORTAL_URL || "http://localhost:3000"}/api/track/${sentEmail.id}`;
  const bodyWithPixel = `${emailBody}<img src="${trackingUrl}" width="1" height="1" style="display:none" alt="" />`;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@leadsportal.com",
      to: lead.customerEmail,
      subject: subject.trim(),
      html: bodyWithPixel,
    });

    return NextResponse.json(sentEmail);
  } catch {
    // Mark as failed
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
