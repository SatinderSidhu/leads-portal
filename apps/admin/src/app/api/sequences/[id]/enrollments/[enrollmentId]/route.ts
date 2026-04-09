import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/session";
import { calculateNextSendAt } from "../../../../../../lib/sequence-utils";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, enrollmentId } = await params;
  let body: { action?: string; stepOrder?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, stepOrder } = body;
  if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 });

  try {
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: { id: enrollmentId, sequenceId: id },
      include: { sequence: { include: { steps: { orderBy: { stepOrder: "asc" } } } } },
    });
    if (!enrollment) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });

    switch (action) {
      case "pause":
        await prisma.sequenceEnrollment.update({
          where: { id: enrollmentId },
          data: { status: "PAUSED", nextSendAt: null },
        });
        break;

      case "resume": {
        const currentStep = enrollment.sequence.steps.find((s) => s.stepOrder === enrollment.currentStepOrder);
        const nextSendAt = currentStep
          ? calculateNextSendAt(currentStep.waitValue, currentStep.waitUnit)
          : new Date();
        await prisma.sequenceEnrollment.update({
          where: { id: enrollmentId },
          data: { status: "ACTIVE", nextSendAt },
        });
        break;
      }

      case "remove":
        await prisma.sequenceEnrollment.update({
          where: { id: enrollmentId },
          data: { status: "REMOVED", exitReason: `Manually removed by ${session.name}`, nextSendAt: null },
        });
        break;

      case "advance": {
        const targetOrder = stepOrder ?? enrollment.currentStepOrder + 1;
        const maxStep = enrollment.sequence.steps.length;
        if (targetOrder > maxStep) {
          await prisma.sequenceEnrollment.update({
            where: { id: enrollmentId },
            data: { status: "COMPLETED", nextSendAt: null, exitReason: "Manually advanced past last step" },
          });
        } else {
          const nextStep = enrollment.sequence.steps.find((s) => s.stepOrder === targetOrder);
          const nextSendAt = nextStep
            ? calculateNextSendAt(nextStep.waitValue, nextStep.waitUnit)
            : new Date();
          await prisma.sequenceEnrollment.update({
            where: { id: enrollmentId },
            data: { currentStepOrder: targetOrder, nextSendAt },
          });
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid action. Use: pause, resume, remove, advance" }, { status: 400 });
    }

    const updated = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { lead: { select: { id: true, customerName: true, customerEmail: true } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update enrollment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
