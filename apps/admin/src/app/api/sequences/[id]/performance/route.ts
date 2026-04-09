import { prisma } from "@leads-portal/database";
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
    const sequence = await prisma.smartSequence.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
          include: { template: { select: { id: true, title: true } } },
        },
      },
    });
    if (!sequence) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });

    // Aggregate enrollment stats
    const [totalEnrolled, active, completed, exited, removed, paused] = await Promise.all([
      prisma.sequenceEnrollment.count({ where: { sequenceId: id } }),
      prisma.sequenceEnrollment.count({ where: { sequenceId: id, status: "ACTIVE" } }),
      prisma.sequenceEnrollment.count({ where: { sequenceId: id, status: "COMPLETED" } }),
      prisma.sequenceEnrollment.count({ where: { sequenceId: id, status: "EXITED" } }),
      prisma.sequenceEnrollment.count({ where: { sequenceId: id, status: "REMOVED" } }),
      prisma.sequenceEnrollment.count({ where: { sequenceId: id, status: "PAUSED" } }),
    ]);

    // Per-step stats: count enrollments at or past each step
    const stepStats = await Promise.all(
      sequence.steps.map(async (step) => {
        const reachedCount = await prisma.sequenceEnrollment.count({
          where: { sequenceId: id, currentStepOrder: { gte: step.stepOrder } },
        });
        const atStep = await prisma.sequenceEnrollment.count({
          where: { sequenceId: id, currentStepOrder: step.stepOrder, status: "ACTIVE" },
        });
        return {
          stepOrder: step.stepOrder,
          templateTitle: step.template.title,
          reached: reachedCount,
          currentlyAt: atStep,
        };
      })
    );

    const conversionRate = totalEnrolled > 0
      ? Math.round((completed / totalEnrolled) * 100)
      : 0;

    return NextResponse.json({
      summary: { totalEnrolled, active, completed, exited, removed, paused, conversionRate },
      stepStats,
    });
  } catch (error) {
    console.error("Failed to fetch performance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
