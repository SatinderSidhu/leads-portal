import { prisma } from "@leads-portal/database";
import type { ListType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const list = await prisma.contactList.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true } },
        triggeredSequences: { select: { id: true, name: true, status: true, _count: { select: { enrollments: true } } } },
      },
    });
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });
    return NextResponse.json(list);
  } catch (error) {
    console.error("Failed to fetch list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, description, isSuppression, filters } = body as {
    name?: string;
    description?: string;
    isSuppression?: boolean;
    filters?: Prisma.InputJsonValue;
  };

  try {
    const list = await prisma.contactList.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isSuppression !== undefined && { isSuppression }),
        ...(filters !== undefined && { filters }),
        updatedBy: session.name,
      },
    });
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.contactList.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
}
