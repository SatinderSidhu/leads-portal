import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { logAudit } from "../../../../../lib/audit";
import { sendNotification } from "../../../../../lib/notify";
import { getSystemEmailContent } from "../../../../../lib/email";

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
      assignedById: session.id,
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

  // Send notification to assignee if different from creator (using system template).
  // Pass the assignee's id explicitly via targetAdminIds so they get the
  // email even when they aren't a watcher on the lead.
  if (assignedToId && assignedToId !== session.id) {
    const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
    const dueDateLabel = dueDate ? new Date(dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "No due date";
    const { subject: taskSubj, html: taskBody } = await getSystemEmailContent("system_task_assigned", {
      projectName: lead.projectName,
      assignedBy: session.name,
      taskContent: content.trim(),
      dueDate: dueDateLabel,
      leadUrl: `${adminUrl}/leads/${id}`,
    }, `Task Assigned: ${lead.projectName}`, `<p><strong>${session.name}</strong> assigned you a task on <strong>${lead.projectName}</strong>: ${content.trim()}</p>`);
    sendNotification({
      event: "lead_assigned",
      leadId: id,
      subject: taskSubj,
      body: taskBody,
      excludeAdminId: session.id,
      targetAdminIds: [assignedToId],
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

  const lead = await prisma.lead.findUnique({ where: { id }, select: { projectName: true } });
  const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";

  if (completed !== undefined) {
    // Look up the original assignee so the audit shows who was supposed
    // to do this vs who actually did it (catches "Jane completed Mike's task").
    let assigneeName: string | null = null;
    if (step.assignedToId && step.assignedToId !== session.id) {
      const a = await prisma.adminUser.findUnique({
        where: { id: step.assignedToId },
        select: { name: true },
      });
      assigneeName = a?.name ?? null;
    }
    const completionDetail = updated.completed
      ? assigneeName
        ? `${session.name} completed ${assigneeName}'s task: "${step.content.slice(0, 80)}"`
        : `Completed: "${step.content.slice(0, 80)}"`
      : `Reopened: "${step.content.slice(0, 80)}"`;
    logAudit(id, "Task " + (updated.completed ? "Completed" : "Reopened"), completionDetail, session.name).catch(() => {});

    // Notify both assignedTo and assignedBy on task completion
    if (updated.completed && lead) {
      const { subject: compSubj, html: compBody } = await getSystemEmailContent("system_task_completed", {
        projectName: lead.projectName,
        completedBy: session.name,
        taskContent: step.content,
        leadUrl: `${adminUrl}/leads/${id}`,
      }, `Task Completed: ${lead.projectName}`, `<p><strong>${session.name}</strong> completed a task on <strong>${lead.projectName}</strong>: ${step.content.slice(0, 100)}</p>`);

      // Notify assignedTo (if not the person completing) — target them
      // directly so they get the email regardless of watcher status.
      if (step.assignedToId && step.assignedToId !== session.id) {
        sendNotification({
          event: "task_completed",
          leadId: id,
          subject: compSubj,
          body: compBody,
          excludeAdminId: session.id,
          targetAdminIds: [step.assignedToId],
        }).catch(() => {});
      }
      // Notify assignedBy (if different from both completer and assignedTo)
      if (step.assignedById && step.assignedById !== session.id && step.assignedById !== step.assignedToId) {
        // Direct email to assignedBy
        try {
          const assigner = await prisma.adminUser.findUnique({ where: { id: step.assignedById }, select: { email: true } });
          if (assigner) {
            const pref = await prisma.notificationPreference.findUnique({ where: { adminId: step.assignedById } });
            if (!pref || pref.taskCompleted !== false) {
              const { transporter, getFromAddress } = await import("../../../../../lib/email");
              await transporter.sendMail({
                from: getFromAddress(),
                to: pref?.notificationEmail || assigner.email,
                subject: compSubj,
                html: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">${compBody}<div style="text-align: center; margin: 30px 0;"><a href="${adminUrl}/leads/${id}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View Lead</a></div></div>`,
              });
            }
          }
        } catch (e) {
          console.error("[Task Completed] Failed to notify assigner:", e);
        }
      }
    }
  }

  // If reassigned, notify new assignee + update assignedBy
  if (assignedToId !== undefined && assignedToId !== step.assignedToId) {
    // Look up the previous assignee's name so the audit entry tells the
    // "from X to Y" story instead of just naming the new owner.
    let previousAssigneeName: string | null = null;
    if (step.assignedToId) {
      const prev = await prisma.adminUser.findUnique({
        where: { id: step.assignedToId },
        select: { name: true },
      });
      previousAssigneeName = prev?.name ?? null;
    }

    // Update assignedById to current user
    await prisma.nextStep.update({ where: { id: stepId }, data: { assignedById: session.id } }).catch(() => {});

    const assigneeName = updated.assignedTo?.name || "Unknown";
    const auditDetail = previousAssigneeName
      ? `"${step.content.slice(0, 80)}" reassigned from ${previousAssigneeName} to ${assigneeName}`
      : `"${step.content.slice(0, 80)}" assigned to ${assigneeName}`;
    logAudit(id, "Task Reassigned", auditDetail, session.name).catch(() => {});

    if (assignedToId !== session.id && lead) {
      const dueDateLabel = step.dueDate ? new Date(step.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "No due date";
      const { subject: taskSubj, html: taskBody } = await getSystemEmailContent("system_task_assigned", {
        projectName: lead.projectName, assignedBy: session.name,
        taskContent: step.content, dueDate: dueDateLabel, leadUrl: `${adminUrl}/leads/${id}`,
      }, `Task Assigned: ${lead.projectName}`, `<p><strong>${session.name}</strong> assigned you a task: ${step.content.slice(0, 100)}</p>`);
      sendNotification({
        event: "lead_assigned",
        leadId: id,
        subject: taskSubj,
        body: taskBody,
        excludeAdminId: session.id,
        // Target the new assignee directly — they may not be a watcher on
        // this lead, in which case the default recipient set would skip them.
        targetAdminIds: [assignedToId],
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
