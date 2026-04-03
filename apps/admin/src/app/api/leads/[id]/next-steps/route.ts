import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { logAudit } from "../../../../../lib/audit";
import { sendNotification } from "../../../../../lib/notify";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const steps = await prisma.nextStep.findMany({
    where: { leadId: id },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(steps);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, dueDate, assignedToId } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { projectName: true, customerName: true },
  });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const step = await prisma.nextStep.create({
    data: {
      leadId: id,
      content: content.trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: session.name,
      assignedToId: assignedToId || session.id,
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  });

  // Determine assignee name for logging
  const assigneeName = step.assignedTo?.name || session.name;
  const dueDateStr = dueDate ? ` (due ${new Date(dueDate).toLocaleDateString()})` : "";

  logAudit(id, "Task Created", `"${content.trim().slice(0, 80)}" assigned to ${assigneeName}${dueDateStr}`, session.name).catch(() => {});

  // Send notification to assignee if different from creator
  if (assignedToId && assignedToId !== session.id) {
    sendNotification({
      event: "lead_assigned",
      leadId: id,
      subject: `Task Assigned: ${lead.projectName}`,
      body: `
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
          <strong>${session.name}</strong> assigned you a task on <strong>${lead.projectName}</strong>:
        </p>
        <div style="background: white; border-left: 4px solid #01358d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">${content.trim()}</p>
          ${dueDate ? `<p style="color: #666; font-size: 13px; margin: 8px 0 0;">Due: ${new Date(dueDate).toLocaleDateString()}</p>` : ""}
        </div>
      `,
      excludeAdminId: session.id,
    }).catch(() => {});
  }

  return NextResponse.json(step, { status: 201 });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stepId, completed, assignedToId } = await req.json();
  if (!stepId) {
    return NextResponse.json({ error: "stepId is required" }, { status: 400 });
  }

  const step = await prisma.nextStep.findFirst({
    where: { id: stepId, leadId: id },
  });
  if (!step) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (completed !== undefined) {
    updateData.completed = completed;
    updateData.completedAt = completed ? new Date() : null;
  }
  if (assignedToId !== undefined) {
    updateData.assignedToId = assignedToId;
  }

  const updated = await prisma.nextStep.update({
    where: { id: stepId },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  });

  if (completed !== undefined) {
    logAudit(id, "Task " + (updated.completed ? "Completed" : "Reopened"), step.content.slice(0, 100), session.name).catch(() => {});
  }

  // If reassigned, notify new assignee
  if (assignedToId !== undefined && assignedToId !== step.assignedToId) {
    const lead = await prisma.lead.findUnique({ where: { id }, select: { projectName: true } });
    const assigneeName = updated.assignedTo?.name || "Unknown";
    logAudit(id, "Task Reassigned", `"${step.content.slice(0, 80)}" reassigned to ${assigneeName}`, session.name).catch(() => {});

    if (assignedToId !== session.id && lead) {
      sendNotification({
        event: "lead_assigned",
        leadId: id,
        subject: `Task Assigned: ${lead.projectName}`,
        body: `
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            <strong>${session.name}</strong> assigned you a task on <strong>${lead.projectName}</strong>:
          </p>
          <div style="background: white; border-left: 4px solid #01358d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">${step.content}</p>
          </div>
        `,
        excludeAdminId: session.id,
      }).catch(() => {});
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const stepId = searchParams.get("stepId");
  if (!stepId) {
    return NextResponse.json({ error: "stepId is required" }, { status: 400 });
  }

  const step = await prisma.nextStep.findFirst({
    where: { id: stepId, leadId: id },
  });
  if (!step) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  await prisma.nextStep.delete({ where: { id: stepId } });

  logAudit(id, "Task Deleted", step.content.slice(0, 100), session.name).catch(() => {});

  return NextResponse.json({ success: true });
}
