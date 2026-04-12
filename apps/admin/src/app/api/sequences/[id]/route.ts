import { prisma } from "@leads-portal/database";
import type { SequenceGoal, SequenceStatus, EnrollmentTrigger, Prisma } from "@prisma/client";
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
    const sequence = await prisma.smartSequence.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
          include: { template: { select: { id: true, title: true, subject: true, purpose: true, sendAfterDays: true } } },
        },
        triggerList: { select: { name: true } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!sequence) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    return NextResponse.json(sequence);
  } catch (error) {
    console.error("Failed to fetch sequence:", error);
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

  const { name, goal, status, enrollmentTrigger, triggerConfig, triggerListId, audienceTags, exitConditions, reEnrollAfterDays } = body as {
    name?: string;
    goal?: string;
    status?: string;
    enrollmentTrigger?: string;
    triggerConfig?: Prisma.InputJsonValue;
    triggerListId?: string | null;
    audienceTags?: Prisma.InputJsonValue;
    exitConditions?: Prisma.InputJsonValue;
    reEnrollAfterDays?: number | null;
  };

  try {
    const sequence = await prisma.smartSequence.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(goal !== undefined && { goal: goal as SequenceGoal }),
        ...(status !== undefined && { status: status as SequenceStatus }),
        ...(enrollmentTrigger !== undefined && { enrollmentTrigger: enrollmentTrigger as EnrollmentTrigger }),
        ...(triggerConfig !== undefined && { triggerConfig }),
        ...(audienceTags !== undefined && { audienceTags }),
        ...(exitConditions !== undefined && { exitConditions }),
        ...(reEnrollAfterDays !== undefined && { reEnrollAfterDays }),
        ...(triggerListId !== undefined && { triggerListId }),
        updatedBy: session.name,
      },
    });
    return NextResponse.json(sequence);
  } catch {
    return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
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
    const sequence = await prisma.smartSequence.findUnique({ where: { id }, select: { status: true } });
    if (!sequence) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    if (sequence.status === "ACTIVE") {
      return NextResponse.json({ error: "Cannot delete an active sequence. Pause it first." }, { status: 400 });
    }
    await prisma.smartSequence.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
  }
}
