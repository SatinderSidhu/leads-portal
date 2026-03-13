import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { sendLeadAssignedEmail } from "../../../../../lib/email";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { assignedToId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.assignedToId) {
    return NextResponse.json(
      { error: "assignedToId is required" },
      { status: 400 }
    );
  }

  // Validate target admin exists and is active
  const targetAdmin = await prisma.adminUser.findUnique({
    where: { id: body.assignedToId },
    select: { id: true, name: true, email: true, active: true },
  });

  if (!targetAdmin || !targetAdmin.active) {
    return NextResponse.json(
      { error: "Target admin not found or inactive" },
      { status: 404 }
    );
  }

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const previousAssigneeId = lead.assignedToId;

  // Update assignment
  const updatedLead = await prisma.lead.update({
    where: { id },
    data: {
      assignedToId: body.assignedToId,
      updatedBy: session.name,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  // Auto-add new assignee as watcher
  await prisma.leadWatcher.upsert({
    where: {
      leadId_adminId: { leadId: id, adminId: body.assignedToId },
    },
    create: { leadId: id, adminId: body.assignedToId },
    update: {},
  });

  // Send notification email if reassigned to a different admin
  if (previousAssigneeId !== body.assignedToId) {
    sendLeadAssignedEmail(
      { projectName: lead.projectName, customerName: lead.customerName, id },
      { name: targetAdmin.name, email: targetAdmin.email },
      { name: session.name }
    ).catch((err) =>
      console.error("[Assign] Failed to send assignment email:", err)
    );
  }

  return NextResponse.json(updatedLead);
}
