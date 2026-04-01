import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "../../../lib/email";
import { getAdminSession } from "../../../lib/session";
import { sendNotification } from "../../../lib/notify";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session = await getAdminSession();

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status") || "";
  const stage = searchParams.get("stage") || "";
  const source = searchParams.get("source") || "";
  const assignedTo = searchParams.get("assignedTo") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  const industry = searchParams.get("industry") || "";

  if (search) {
    where.OR = [
      { projectName: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
      { jobTitle: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) where.status = status;
  if (stage) where.stage = stage;
  if (source) where.source = source;
  if (industry) where.industry = { contains: industry, mode: "insensitive" };

  // Filter by assigned admin: "me" = current user, specific ID, or "" = all
  if (assignedTo === "me" && session) {
    where.assignedToId = session.id;
  } else if (assignedTo && assignedTo !== "all") {
    where.assignedToId = assignedTo;
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const session = await getAdminSession();
  const adminName = session?.name || "Unknown";

  const lead = await prisma.lead.create({
    data: {
      projectName: body.projectName,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      projectDescription: body.projectDescription,
      phone: body.phone?.trim() || null,
      city: body.city?.trim() || null,
      zip: body.zip?.trim() || null,
      dateCreated: body.dateCreated ? new Date(body.dateCreated) : null,
      source: body.source || "MANUAL",
      stage: body.stage || "COLD",
      createdBy: adminName,
      // Core contact fields
      jobTitle: body.jobTitle?.trim() || null,
      companyName: body.companyName?.trim() || null,
      location: body.location?.trim() || null,
      linkedinUrl: body.linkedinUrl?.trim() || null,
      // Company intelligence fields
      industry: body.industry?.trim() || null,
      companySize: body.companySize?.trim() || null,
      companyWebsite: body.companyWebsite?.trim() || null,
      // Lead management fields
      extractedDate: body.extractedDate ? new Date(body.extractedDate) : null,
      lastContactedDate: body.lastContactedDate ? new Date(body.lastContactedDate) : null,
      leadScore: body.leadScore != null ? parseInt(body.leadScore, 10) : null,
      // Outreach tracking
      connectionRequestSent: body.connectionRequestSent ?? false,
      connectionAccepted: body.connectionAccepted ?? false,
      initialMessageSent: body.initialMessageSent ?? false,
      meetingBooked: body.meetingBooked ?? false,
      meetingDate: body.meetingDate ? new Date(body.meetingDate) : null,
      responseReceived: body.responseReceived ?? false,
      ...(session && { assignedToId: session.id }),
    },
  });

  // Auto-add creating admin as watcher
  if (session) {
    await prisma.leadWatcher.create({
      data: { leadId: lead.id, adminId: session.id },
    });
  }

  await prisma.statusHistory.create({
    data: {
      leadId: lead.id,
      fromStatus: null,
      toStatus: "NEW",
      changedBy: adminName,
    },
  });

  if (body.sendEmail) {
    try {
      const { subject, html } = await sendWelcomeEmail(lead, session ? { name: session.name } : undefined);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { emailSent: true },
      });
      // Log in email history
      await prisma.sentEmail.create({
        data: {
          leadId: lead.id,
          subject,
          body: html,
          status: "SENT",
          sentBy: adminName,
        },
      });
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      return NextResponse.json(
        { ...lead, emailWarning: "Lead saved but email failed to send" },
        { status: 201 }
      );
    }
  }

  // Notify admins about new lead (non-blocking, broadcast to all)
  sendNotification({
    event: "new_lead_created",
    leadId: lead.id,
    subject: `New Lead: ${lead.projectName}`,
    body: `
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
        A new lead has been created by <strong>${adminName}</strong>.
      </p>
      <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e5e7eb;">
        <p style="margin: 4px 0; font-size: 14px;"><strong>Project:</strong> ${lead.projectName}</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Customer:</strong> ${lead.customerName} (${lead.customerEmail})</p>
        ${lead.companyName ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Company:</strong> ${lead.companyName}</p>` : ""}
      </div>
    `,
    broadcastToAll: true,
    excludeAdminId: session?.id,
  }).catch(() => {});

  return NextResponse.json(lead, { status: 201 });
}
