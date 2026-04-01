import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/session";
import { sendSowSignedNotification } from "../../../../../lib/email";
import { headers } from "next/headers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sowId: string }> }
) {
  const { sowId } = await params;
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { signerName } = await req.json();
  if (!signerName?.trim()) {
    return NextResponse.json(
      { error: "Signer name is required" },
      { status: 400 }
    );
  }

  const sow = await prisma.scopeOfWork.findFirst({
    where: {
      id: sowId,
      sharedAt: { not: null },
      leadId: { in: session.leadIds as string[] },
    },
    include: {
      lead: {
        select: { id: true, customerName: true, customerEmail: true, projectName: true, status: true },
      },
    },
  });

  if (!sow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (sow.signedAt) {
    return NextResponse.json(
      { error: "This SOW has already been signed" },
      { status: 400 }
    );
  }

  const headersList = await headers();
  const signerIp =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";

  const signedAt = new Date();

  // Update SOW with signature
  await prisma.scopeOfWork.update({
    where: { id: sowId },
    data: {
      signedAt,
      signerName: signerName.trim(),
      signerIp,
    },
  });

  // Update lead status to SOW_SIGNED if currently at SOW_READY
  if (sow.lead.status === "SOW_READY") {
    await prisma.lead.update({
      where: { id: sow.leadId },
      data: { status: "SOW_SIGNED" },
    });

    await prisma.statusHistory.create({
      data: {
        leadId: sow.leadId,
        fromStatus: "SOW_READY",
        toStatus: "SOW_SIGNED",
        changedBy: `Customer: ${session.name}`,
      },
    });
  }

  // Send email notifications (non-blocking)
  sendSowSignedNotification(
    sow.lead,
    sow.version,
    signerName.trim(),
    signedAt,
    signerIp
  ).catch(() => {});

  await prisma.auditLog.create({ data: { leadId: sow.leadId, action: "SOW Signed", detail: `Version ${sow.version} signed by ${signerName.trim()}`, actor: `${signerName.trim()} (Customer)` } }).catch(() => {});

  return NextResponse.json({
    signedAt: signedAt.toISOString(),
    signerName: signerName.trim(),
  });
}
