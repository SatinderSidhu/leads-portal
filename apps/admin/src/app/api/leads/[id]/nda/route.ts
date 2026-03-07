import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { generateNdaContent } from "../../../../../lib/nda-template";

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

  return NextResponse.json(nda, { status: 201 });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  const nda = await prisma.nda.findUnique({ where: { leadId: id } });
  if (!nda) {
    return NextResponse.json({ error: "NDA not found" }, { status: 404 });
  }

  if (nda.status === "SIGNED") {
    return NextResponse.json(
      { error: "Cannot edit a signed NDA" },
      { status: 400 }
    );
  }

  const updated = await prisma.nda.update({
    where: { id: nda.id },
    data: { content: content.trim() },
  });

  return NextResponse.json(updated);
}
