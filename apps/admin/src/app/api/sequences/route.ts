import { prisma } from "@leads-portal/database";
import type { SequenceGoal, EnrollmentTrigger, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sequences = await prisma.smartSequence.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { steps: true, enrollments: true } },
      },
    });
    return NextResponse.json(sequences);
  } catch (error) {
    console.error("Failed to fetch sequences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, goal, enrollmentTrigger, triggerConfig, audienceTags, exitConditions, reEnrollAfterDays } = body as {
    name?: string;
    goal?: string;
    enrollmentTrigger?: string;
    triggerConfig?: Prisma.InputJsonValue;
    audienceTags?: Prisma.InputJsonValue;
    exitConditions?: Prisma.InputJsonValue;
    reEnrollAfterDays?: number;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!goal) {
    return NextResponse.json({ error: "Goal is required" }, { status: 400 });
  }

  try {
    const sequence = await prisma.smartSequence.create({
      data: {
        name: name.trim(),
        goal: goal as SequenceGoal,
        enrollmentTrigger: (enrollmentTrigger as EnrollmentTrigger) || "MANUAL",
        triggerConfig: triggerConfig || {},
        audienceTags: audienceTags || [],
        exitConditions: exitConditions || [],
        reEnrollAfterDays: reEnrollAfterDays ?? null,
        createdBy: session.name,
      },
    });
    return NextResponse.json(sequence, { status: 201 });
  } catch (error) {
    console.error("Failed to create sequence:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
