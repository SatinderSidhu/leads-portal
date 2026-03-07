import { prisma } from "@leads-portal/database";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const flow = await prisma.emailFlow.findUnique({ where: { id } });

  if (!flow) {
    return NextResponse.json({ error: "Email flow not found" }, { status: 404 });
  }

  return NextResponse.json(flow);
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

  const { name, description, nodes, edges } = body as {
    name?: string;
    description?: string;
    nodes?: unknown[];
    edges?: unknown[];
  };

  if (name !== undefined && !name?.trim()) {
    return NextResponse.json(
      { error: "Name cannot be empty" },
      { status: 400 }
    );
  }

  try {
    const session = await getAdminSession();
    const flow = await prisma.emailFlow.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(nodes !== undefined && { nodes: nodes as Prisma.InputJsonValue }),
        ...(edges !== undefined && { edges: edges as Prisma.InputJsonValue }),
        updatedBy: session?.name || "Unknown",
      },
    });
    return NextResponse.json(flow);
  } catch {
    return NextResponse.json({ error: "Email flow not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.emailFlow.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Email flow not found" }, { status: 404 });
  }
}
