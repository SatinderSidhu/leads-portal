import { prisma } from "@leads-portal/database";
import type { WaitUnit, StepCondition } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const steps = await prisma.sequenceStep.findMany({
      where: { sequenceId: id },
      orderBy: { stepOrder: "asc" },
      include: { template: { select: { id: true, title: true, subject: true, purpose: true, sendAfterDays: true } } },
    });
    return NextResponse.json(steps);
  } catch (error) {
    console.error("Failed to fetch steps:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

interface StepInput {
  templateId: string;
  waitValue: number;
  waitUnit: string;
  condition: string;
  goToStepOrder?: number | null;
  exitOnCondition?: string | null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { steps?: StepInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { steps } = body;
  if (!Array.isArray(steps)) {
    return NextResponse.json({ error: "steps must be an array" }, { status: 400 });
  }

  for (let i = 0; i < steps.length; i++) {
    if (!steps[i].templateId) {
      return NextResponse.json({ error: `Step ${i + 1}: templateId is required` }, { status: 400 });
    }
    if (steps[i].waitValue < 0) {
      return NextResponse.json({ error: `Step ${i + 1}: waitValue must be >= 0` }, { status: 400 });
    }
  }

  try {
    // Verify sequence exists
    const sequence = await prisma.smartSequence.findUnique({ where: { id }, select: { id: true } });
    if (!sequence) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });

    // Replace all steps in a transaction
    const result = await prisma.$transaction(async (tx) => {
      await tx.sequenceStep.deleteMany({ where: { sequenceId: id } });
      const created = await Promise.all(
        steps.map((step, index) =>
          tx.sequenceStep.create({
            data: {
              sequenceId: id,
              stepOrder: index + 1,
              templateId: step.templateId,
              waitValue: step.waitValue ?? 1,
              waitUnit: (step.waitUnit as WaitUnit) || "DAYS",
              condition: (step.condition as StepCondition) || "ALWAYS",
              goToStepOrder: step.goToStepOrder ?? null,
              exitOnCondition: step.exitOnCondition ? (step.exitOnCondition as StepCondition) : null,
            },
            include: { template: { select: { id: true, title: true, subject: true, purpose: true, sendAfterDays: true } } },
          })
        )
      );
      return created;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to save steps:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
