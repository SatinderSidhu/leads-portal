import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      nda: true,
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(lead);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const session = await getAdminSession();

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const errors: string[] = [];
  if (body.projectName !== undefined && !body.projectName?.trim()) errors.push("projectName cannot be empty");
  if (body.customerName !== undefined && !body.customerName?.trim()) errors.push("customerName cannot be empty");
  if (body.customerEmail !== undefined && !body.customerEmail?.trim()) errors.push("customerEmail cannot be empty");
  if (body.projectDescription !== undefined && !body.projectDescription?.trim()) errors.push("projectDescription cannot be empty");

  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  const updatedLead = await prisma.lead.update({
    where: { id },
    data: {
      ...(body.projectName !== undefined && { projectName: body.projectName.trim() }),
      ...(body.customerName !== undefined && { customerName: body.customerName.trim() }),
      ...(body.customerEmail !== undefined && { customerEmail: body.customerEmail.trim() }),
      ...(body.projectDescription !== undefined && { projectDescription: body.projectDescription.trim() }),
      updatedBy: session?.name || "Unknown",
    },
  });

  return NextResponse.json(updatedLead);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
}
