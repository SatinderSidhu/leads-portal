import { prisma } from "@leads-portal/database";
import { NextRequest, NextResponse } from "next/server";
import { sendNdaSignedEmail } from "../../../../lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { leadId, signerName } = body;

  if (!leadId || !signerName?.trim()) {
    return NextResponse.json(
      { error: "leadId and signerName are required" },
      { status: 400 }
    );
  }

  const nda = await prisma.nda.findUnique({
    where: { leadId },
    include: {
      lead: {
        select: {
          customerName: true,
          customerEmail: true,
          projectName: true,
        },
      },
    },
  });

  if (!nda) {
    return NextResponse.json({ error: "NDA not found" }, { status: 404 });
  }

  if (nda.status === "SIGNED") {
    return NextResponse.json(
      { error: "NDA has already been signed" },
      { status: 400 }
    );
  }

  const signerIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const signedAt = new Date();

  const updatedNda = await prisma.nda.update({
    where: { id: nda.id },
    data: {
      status: "SIGNED",
      signerName: signerName.trim(),
      signerIp,
      signedAt,
    },
  });

  try {
    const portalUrl = `${process.env.CUSTOMER_PORTAL_URL || "http://localhost:3001"}?id=${leadId}`;
    await sendNdaSignedEmail({
      leadId,
      customerName: nda.lead.customerName,
      customerEmail: nda.lead.customerEmail,
      projectName: nda.lead.projectName,
      signerName: signerName.trim(),
      signedAt,
      signerIp,
      portalUrl,
    });
  } catch (error) {
    console.error("Failed to send NDA signed emails:", error);
  }

  await prisma.auditLog.create({ data: { leadId, action: "NDA Signed", detail: `Signed by ${signerName.trim()}`, actor: `${signerName.trim()} (Customer)` } }).catch(() => {});

  return NextResponse.json(updatedNda);
}
