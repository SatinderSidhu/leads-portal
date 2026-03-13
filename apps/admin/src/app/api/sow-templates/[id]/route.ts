import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = await prisma.sowTemplate.findUnique({ where: { id } });

  if (!template) {
    return NextResponse.json(
      { error: "SOW template not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(template);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    name,
    description,
    content,
    industry,
    projectType,
    durationRange,
    costRange,
    isDefault,
  } = body as {
    name?: string;
    description?: string;
    content?: string;
    industry?: string;
    projectType?: string;
    durationRange?: string;
    costRange?: string;
    isDefault?: boolean;
  };

  const errors: string[] = [];
  if (name !== undefined && !name?.trim()) errors.push("Name cannot be empty");
  if (content !== undefined && !content?.trim())
    errors.push("Content cannot be empty");

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  try {
    // If setting as default, unset any existing default
    if (isDefault) {
      await prisma.sowTemplate.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const template = await prisma.sowTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(content !== undefined && { content: content.trim() }),
        ...(industry !== undefined && {
          industry: industry?.trim() || null,
        }),
        ...(projectType !== undefined && {
          projectType: projectType?.trim() || null,
        }),
        ...(durationRange !== undefined && {
          durationRange: durationRange?.trim() || null,
        }),
        ...(costRange !== undefined && {
          costRange: costRange?.trim() || null,
        }),
        ...(isDefault !== undefined && { isDefault }),
        updatedBy: session.name || "Unknown",
      },
    });
    return NextResponse.json(template);
  } catch {
    return NextResponse.json(
      { error: "SOW template not found" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.sowTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "SOW template not found" },
      { status: 404 }
    );
  }
}
