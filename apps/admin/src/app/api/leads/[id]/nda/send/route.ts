import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { sendNdaReadyEmail } from "../../../../../../lib/email";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const nda = await prisma.nda.findUnique({ where: { leadId: id } });
  if (!nda) {
    return NextResponse.json({ error: "NDA not found" }, { status: 404 });
  }

  if (nda.status === "SIGNED") {
    return NextResponse.json(
      { error: "NDA has already been signed" },
      { status: 400 }
    );
  }

  try {
    await sendNdaReadyEmail(lead);
    const updated = await prisma.nda.update({
      where: { id: nda.id },
      data: { status: "SENT" },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to send NDA email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
