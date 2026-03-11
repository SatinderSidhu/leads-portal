import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../../lib/session";
import { sendSowReadyEmail } from "../../../../../../../lib/email";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; sowId: string }> }
) {
  const { id, sowId } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { customerName: true, customerEmail: true, projectName: true },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const sow = await prisma.scopeOfWork.findFirst({
    where: { id: sowId, leadId: id },
  });

  if (!sow) {
    return NextResponse.json({ error: "SOW not found" }, { status: 404 });
  }

  const session = await getAdminSession();

  // Mark SOW as shared
  await prisma.scopeOfWork.update({
    where: { id: sowId },
    data: {
      sharedAt: new Date(),
      sharedBy: session?.name || "Unknown",
    },
  });

  // Update lead status to SOW_READY if currently NEW
  if ((await prisma.lead.findUnique({ where: { id } }))?.status === "NEW") {
    await prisma.lead.update({
      where: { id },
      data: { status: "SOW_READY" },
    });
    await prisma.statusHistory.create({
      data: {
        leadId: id,
        fromStatus: "NEW",
        toStatus: "SOW_READY",
        changedBy: session?.name || "Unknown",
      },
    });
  }

  // Send email to customer
  try {
    await sendSowReadyEmail(lead, id, sow.version, session ? { name: session.name } : undefined);
  } catch (error) {
    console.error("Failed to send SOW email:", error);
    return NextResponse.json(
      { warning: "SOW shared but email failed to send" },
      { status: 200 }
    );
  }

  return NextResponse.json({ success: true });
}
