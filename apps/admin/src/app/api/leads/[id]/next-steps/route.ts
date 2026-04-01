import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const steps = await prisma.nextStep.findMany({
    where: { leadId: id },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(steps);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, dueDate } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const step = await prisma.nextStep.create({
    data: {
      leadId: id,
      content: content.trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: session.name,
    },
  });

  return NextResponse.json(step, { status: 201 });
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

  const { stepId, completed } = await req.json();
  if (!stepId) {
    return NextResponse.json({ error: "stepId is required" }, { status: 400 });
  }

  const step = await prisma.nextStep.findFirst({
    where: { id: stepId, leadId: id },
  });
  if (!step) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  const updated = await prisma.nextStep.update({
    where: { id: stepId },
    data: {
      completed: completed ?? !step.completed,
      completedAt: completed ?? !step.completed ? new Date() : null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const stepId = searchParams.get("stepId");
  if (!stepId) {
    return NextResponse.json({ error: "stepId is required" }, { status: 400 });
  }

  const step = await prisma.nextStep.findFirst({
    where: { id: stepId, leadId: id },
  });
  if (!step) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  await prisma.nextStep.delete({ where: { id: stepId } });
  return NextResponse.json({ success: true });
}
