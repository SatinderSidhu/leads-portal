import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { generateNdaContent } from "../../../../../lib/nda-template";
import { sendNdaReadyEmail } from "../../../../../lib/email";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const nda = await prisma.nda.findUnique({
    where: { leadId: id },
  });

  if (!nda) {
    return NextResponse.json({ error: "NDA not found" }, { status: 404 });
  }

  return NextResponse.json(nda);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const existingNda = await prisma.nda.findUnique({ where: { leadId: id } });
  if (existingNda) {
    return NextResponse.json(
      { error: "NDA already exists for this lead" },
      { status: 409 }
    );
  }

  const content = generateNdaContent({
    companyName: process.env.COMPANY_NAME || "Company",
    customerName: lead.customerName,
    projectName: lead.projectName,
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  });

  const nda = await prisma.nda.create({
    data: {
      leadId: id,
      content,
    },
  });

  try {
    await sendNdaReadyEmail(lead);
    await prisma.nda.update({
      where: { id: nda.id },
      data: { status: "SENT" },
    });
  } catch (error) {
    console.error("Failed to send NDA ready email:", error);
    return NextResponse.json(
      { ...nda, emailWarning: "NDA created but email failed to send" },
      { status: 201 }
    );
  }

  const updatedNda = await prisma.nda.findUnique({ where: { id: nda.id } });
  return NextResponse.json(updatedNda, { status: 201 });
}
