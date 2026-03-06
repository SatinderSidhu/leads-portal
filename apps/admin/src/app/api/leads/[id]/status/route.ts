import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { sendStatusUpdateEmail } from "../../../../../lib/email";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, sendEmail } = await req.json();

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const previousStatus = lead.status;

  const updatedLead = await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: { status },
    });

    await tx.statusHistory.create({
      data: {
        leadId: id,
        fromStatus: previousStatus,
        toStatus: status,
      },
    });

    return updated;
  });

  if (sendEmail) {
    try {
      await sendStatusUpdateEmail(updatedLead, previousStatus, status);
    } catch (error) {
      console.error("Failed to send status update email:", error);
      return NextResponse.json({
        ...updatedLead,
        emailWarning: "Status updated but email failed to send",
      });
    }
  }

  return NextResponse.json(updatedLead);
}
