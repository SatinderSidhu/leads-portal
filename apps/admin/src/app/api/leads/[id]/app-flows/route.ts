import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const flows = await prisma.appFlow.findMany({
    where: { leadId: id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { comments: true } } },
  });

  return NextResponse.json(flows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const session = await getAdminSession();
  const body = await req.json();
  const { name, description, flowType, nodes, edges } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const flow = await prisma.appFlow.create({
    data: {
      leadId: id,
      name: name.trim(),
      description: description?.trim() || null,
      flowType: flowType || "BASIC",
      nodes: nodes || [],
      edges: edges || [],
      createdBy: session?.name || "Unknown",
    },
  });

  return NextResponse.json(flow, { status: 201 });
}
