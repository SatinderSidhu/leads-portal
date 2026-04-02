import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { sendStatusUpdateEmail } from "../../../../../lib/email";
import { getAdminSession } from "../../../../../lib/session";
import { notifyWatchers } from "../../../../../lib/watcher-notifications";
import { logAudit } from "../../../../../lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, sendEmail } = await req.json();
  const session = await getAdminSession();
  const adminName = session?.name || "Unknown";

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const previousStatus = lead.status;

  // Auto-enable doNotContact for closed statuses
  const DO_NOT_CONTACT_STATUSES = ["LOST", "NO_RESPONSE", "ON_HOLD", "CANCELLED"];
  const autoDoNotContact = DO_NOT_CONTACT_STATUSES.includes(status);

  const updatedLead = await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: {
        status,
        updatedBy: adminName,
        ...(autoDoNotContact && !lead.doNotContact && { doNotContact: true }),
      },
    });

    await tx.statusHistory.create({
      data: {
        leadId: id,
        fromStatus: previousStatus,
        toStatus: status,
        changedBy: adminName,
      },
    });

    return updated;
  });

  // Log doNotContact auto-enable
  if (autoDoNotContact && !lead.doNotContact) {
    logAudit(id, "Do Not Contact Enabled", `Auto-enabled due to status change to ${status}`, adminName).catch(() => {});
  }

  // Block email if doNotContact
  if (sendEmail && updatedLead.doNotContact) {
    logAudit(id, "Status Changed", `${previousStatus} → ${status}`, session?.name).catch(() => {});
    return NextResponse.json({
      ...updatedLead,
      emailWarning: "Status updated but email blocked — Do Not Contact is enabled",
    });
  }

  if (sendEmail) {
    try {
      await sendStatusUpdateEmail(updatedLead, previousStatus, status, session ? { name: session.name } : undefined);
    } catch (error) {
      console.error("Failed to send status update email:", error);
      return NextResponse.json({
        ...updatedLead,
        emailWarning: "Status updated but email failed to send",
      });
    }
  }

  logAudit(id, "Status Changed", `${previousStatus} → ${status}`, session?.name).catch(() => {});

  // Notify watchers (non-blocking)
  notifyWatchers({
    leadId: id,
    type: "status_change",
    excludeAdminId: session?.id,
    context: {
      fromStatus: previousStatus,
      toStatus: status,
      changedBy: adminName,
    },
  }).catch(() => {});

  return NextResponse.json(updatedLead);
}
