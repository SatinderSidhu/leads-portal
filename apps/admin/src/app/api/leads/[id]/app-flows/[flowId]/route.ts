import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAdminSession } from "../../../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; flowId: string }> }
) {
  const { id, flowId } = await params;

  const flow = await prisma.appFlow.findFirst({
    where: { id: flowId, leadId: id },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });

  if (!flow) {
    return NextResponse.json({ error: "App flow not found" }, { status: 404 });
  }

  return NextResponse.json(flow);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; flowId: string }> }
) {
  const { id, flowId } = await params;

  const existing = await prisma.appFlow.findFirst({
    where: { id: flowId, leadId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "App flow not found" }, { status: 404 });
  }

  const session = await getAdminSession();
  const body = await req.json();
  const { name, description, nodes, edges, flowType } = body;

  const updated = await prisma.appFlow.update({
    where: { id: flowId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && {
        description: description?.trim() || null,
      }),
      ...(flowType !== undefined && { flowType }),
      ...(nodes !== undefined && { nodes: nodes as Prisma.InputJsonValue }),
      ...(edges !== undefined && { edges: edges as Prisma.InputJsonValue }),
      updatedBy: session?.name || "Unknown",
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; flowId: string }> }
) {
  const { id, flowId } = await params;

  const existing = await prisma.appFlow.findFirst({
    where: { id: flowId, leadId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "App flow not found" }, { status: 404 });
  }

  await prisma.appFlow.delete({ where: { id: flowId } });

  return NextResponse.json({ success: true });
}
