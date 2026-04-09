import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { formatWaitDescription, formatConditionLabel } from "../../../../../lib/sequence-utils";

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
          include: { template: { select: { title: true } } },
        },
      },
    });
    if (!sequence) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });

    // Build plain-language preview
    let cumulativeDays = 0;
    const lines: string[] = [];

    for (const step of sequence.steps) {
      const waitDesc = formatWaitDescription(step.waitValue, step.waitUnit);
      const condDesc = formatConditionLabel(step.condition);

      // Calculate cumulative day offset
      let dayOffset = cumulativeDays;
      if (step.waitUnit === "HOURS") dayOffset += Math.ceil(step.waitValue / 24);
      else if (step.waitUnit === "DAYS") dayOffset += step.waitValue;
      else if (step.waitUnit === "WEEKS") dayOffset += step.waitValue * 7;
      cumulativeDays = dayOffset;

      let line = `Day ${dayOffset}: Send '${step.template.title}'`;
      if (step.stepOrder > 1) {
        line = `Day ${dayOffset}: Wait ${waitDesc}`;
        if (step.condition !== "ALWAYS") {
          line += `, ${condDesc.toLowerCase()} → send '${step.template.title}'`;
        } else {
          line += ` → send '${step.template.title}'`;
        }
      }

      if (step.goToStepOrder) {
        line += ` | Otherwise → skip to Step ${step.goToStepOrder}`;
      }
      if (step.exitOnCondition) {
        line += ` | Exit if ${formatConditionLabel(step.exitOnCondition).toLowerCase()}`;
      }

      lines.push(line);
    }

    // Exit conditions
    const exitConditions = sequence.exitConditions as string[];
    if (exitConditions.length > 0) {
      const exitLabels: Record<string, string> = {
        REPLIED: "contact replies",
        MEETING_BOOKED: "contact books a meeting",
        UNSUBSCRIBED: "contact unsubscribes",
        MANUAL_REMOVE: "manually removed",
      };
      const exitDesc = exitConditions.map((c) => exitLabels[c] || c).join(" or ");
      lines.push(`Exit: If ${exitDesc} → remove from sequence`);
    }

    return NextResponse.json({
      name: sequence.name,
      goal: sequence.goal,
      status: sequence.status,
      stepCount: sequence.steps.length,
      preview: lines,
    });
  } catch (error) {
    console.error("Failed to generate preview:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
