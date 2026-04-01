import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";
import { logAudit } from "../../../../lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      nda: true,
      sentEmails: {
        include: {
          template: { select: { title: true, purpose: true } },
          attachments: true,
        },
        orderBy: { createdAt: "desc" },
      },
      receivedEmails: { orderBy: { receivedAt: "desc" } },
      files: { orderBy: { createdAt: "desc" } },
      assignedTo: { select: { id: true, name: true, email: true } },
      watchers: {
        include: { admin: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { sentEmails: true } },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(lead);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const session = await getAdminSession();

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const errors: string[] = [];
    if (body.projectName !== undefined && !body.projectName?.trim()) errors.push("projectName cannot be empty");
    if (body.customerName !== undefined && !body.customerName?.trim()) errors.push("customerName cannot be empty");
    if (body.customerEmail !== undefined && !body.customerEmail?.trim()) errors.push("customerEmail cannot be empty");
    if (body.projectDescription !== undefined && !body.projectDescription?.trim()) errors.push("projectDescription cannot be empty");

    if (errors.length > 0) {
      return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        ...(body.projectName !== undefined && { projectName: body.projectName.trim() }),
        ...(body.customerName !== undefined && { customerName: body.customerName.trim() }),
        ...(body.customerEmail !== undefined && { customerEmail: body.customerEmail.trim() }),
        ...(body.projectDescription !== undefined && { projectDescription: body.projectDescription.trim() }),
        ...(body.stage !== undefined && { stage: body.stage }),
        ...(body.linkedinUrl !== undefined && { linkedinUrl: body.linkedinUrl?.trim() || null }),
        ...(body.facebookUrl !== undefined && { facebookUrl: body.facebookUrl?.trim() || null }),
        ...(body.twitterUrl !== undefined && { twitterUrl: body.twitterUrl?.trim() || null }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.city !== undefined && { city: body.city?.trim() || null }),
        ...(body.zip !== undefined && { zip: body.zip?.trim() || null }),
        ...(body.dateCreated !== undefined && { dateCreated: body.dateCreated ? new Date(body.dateCreated) : null }),
        // Core contact fields
        ...(body.jobTitle !== undefined && { jobTitle: body.jobTitle?.trim() || null }),
        ...(body.companyName !== undefined && { companyName: body.companyName?.trim() || null }),
        ...(body.location !== undefined && { location: body.location?.trim() || null }),
        // Company intelligence fields
        ...(body.industry !== undefined && { industry: body.industry?.trim() || null }),
        ...(body.companySize !== undefined && { companySize: body.companySize?.trim() || null }),
        ...(body.companyWebsite !== undefined && { companyWebsite: body.companyWebsite?.trim() || null }),
        // Lead management fields
        ...(body.source !== undefined && { source: body.source }),
        ...(body.extractedDate !== undefined && { extractedDate: body.extractedDate ? new Date(body.extractedDate) : null }),
        ...(body.lastContactedDate !== undefined && { lastContactedDate: body.lastContactedDate ? new Date(body.lastContactedDate) : null }),
        ...(body.leadScore !== undefined && { leadScore: body.leadScore != null ? parseInt(body.leadScore, 10) : null }),
        // Outreach tracking
        ...(body.connectionRequestSent !== undefined && { connectionRequestSent: body.connectionRequestSent }),
        ...(body.connectionAccepted !== undefined && { connectionAccepted: body.connectionAccepted }),
        ...(body.initialMessageSent !== undefined && { initialMessageSent: body.initialMessageSent }),
        ...(body.meetingBooked !== undefined && { meetingBooked: body.meetingBooked }),
        ...(body.meetingDate !== undefined && { meetingDate: body.meetingDate ? new Date(body.meetingDate) : null }),
        ...(body.responseReceived !== undefined && { responseReceived: body.responseReceived }),
        updatedBy: session?.name || "Unknown",
      },
    });

    logAudit(id, "Lead Updated", null, session?.name || "Unknown").catch(() => {});

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error("[PUT /api/leads/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
}
