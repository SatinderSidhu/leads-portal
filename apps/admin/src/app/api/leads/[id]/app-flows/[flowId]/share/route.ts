import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../../lib/session";
import { sendAppFlowReadyEmail } from "../../../../../../../lib/email";
import { logAudit } from "../../../../../../../lib/audit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; flowId: string }> }
) {
  const { id, flowId } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { customerName: true, customerEmail: true, projectName: true, status: true },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const flow = await prisma.appFlow.findFirst({
    where: { id: flowId, leadId: id },
  });

  if (!flow) {
    return NextResponse.json({ error: "App flow not found" }, { status: 404 });
  }

  const session = await getAdminSession();

  // Mark flow as shared
  await prisma.appFlow.update({
    where: { id: flowId },
    data: {
      sharedAt: new Date(),
      sharedBy: session?.name || "Unknown",
    },
  });

  // Update lead status to APP_FLOW_READY if currently SOW_READY
  if (lead.status === "SOW_READY") {
    await prisma.lead.update({
      where: { id },
      data: { status: "APP_FLOW_READY" },
    });
    await prisma.statusHistory.create({
      data: {
        leadId: id,
        fromStatus: "SOW_READY",
        toStatus: "APP_FLOW_READY",
        changedBy: session?.name || "Unknown",
      },
    });
  }

  // Send email to customer
  try {
    const { subject, html } = await sendAppFlowReadyEmail(
      lead,
      id,
      flow.name,
      session ? { name: session.name } : undefined
    );
    // Log in email history
    await prisma.sentEmail.create({
      data: {
        leadId: id,
        subject,
        body: html,
        status: "SENT",
        sentBy: session?.name || "System",
      },
    });
  } catch (error) {
    console.error("Failed to send app flow email:", error);
    return NextResponse.json(
      { warning: "App flow shared but email failed to send" },
      { status: 200 }
    );
  }

  logAudit(id, "App Flow Shared", `"${flow.name}" shared with customer`, session?.name).catch(() => {});

  return NextResponse.json({ success: true });
}
