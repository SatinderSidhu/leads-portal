import { prisma } from "@leads-portal/database";
import type { EmailTemplatePurpose } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = await prisma.emailTemplate.findUnique({ where: { id } });

  if (!template) {
    return NextResponse.json({ error: "Email template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { title, subject, body: templateBody, tags, notes, purpose } = body as {
    title?: string;
    subject?: string;
    body?: string;
    tags?: string[];
    notes?: string;
    purpose?: string;
  };

  const errors: string[] = [];
  if (title !== undefined && !title?.trim()) errors.push("Title cannot be empty");
  if (subject !== undefined && !subject?.trim()) errors.push("Subject cannot be empty");
  if (templateBody !== undefined && !templateBody?.trim()) errors.push("Body cannot be empty");

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  try {
    const session = await getAdminSession();
    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(subject !== undefined && { subject: subject.trim() }),
        ...(templateBody !== undefined && { body: templateBody.trim() }),
        ...(tags !== undefined && { tags }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(purpose !== undefined && { purpose: purpose as EmailTemplatePurpose }),
        updatedBy: session?.name || "Unknown",
      },
    });
    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: "Email template not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const template = await prisma.emailTemplate.findUnique({ where: { id }, select: { systemKey: true } });
    if (template?.systemKey) {
      return NextResponse.json({ error: "System templates cannot be deleted" }, { status: 403 });
    }
    await prisma.emailTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Email template not found" }, { status: 404 });
  }
}
