import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { calculateNextSendAt } from "../../../../../lib/sequence-utils";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { sequenceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sequenceId } = body;
  if (!sequenceId) return NextResponse.json({ error: "sequenceId is required" }, { status: 400 });

  try {
    // Get all list members
    const members = await prisma.listMembership.findMany({
      where: { listId: id },
      select: { leadId: true },
    });

    if (members.length === 0) {
      return NextResponse.json({ error: "List has no members" }, { status: 400 });
    }

    // Load sequence + first step
    const sequence = await prisma.smartSequence.findUnique({
      where: { id: sequenceId },
      include: { steps: { orderBy: { stepOrder: "asc" }, take: 1 } },
    });
    if (!sequence) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    if (sequence.steps.length === 0) return NextResponse.json({ error: "Sequence has no steps" }, { status: 400 });

    const firstStep = sequence.steps[0];
    const now = new Date();
    const nextSendAt = firstStep.waitValue === 0
      ? now
      : calculateNextSendAt(firstStep.waitValue, firstStep.waitUnit, now);

    const leadIds = members.map((m) => m.leadId);

    // Filter out DNC, suppressed, and already enrolled
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds }, doNotContact: false },
      select: { id: true },
    });

    // Check suppression
    const suppressed = await prisma.listMembership.findMany({
      where: { leadId: { in: leads.map((l) => l.id) }, list: { isSuppression: true } },
      select: { leadId: true },
    });
    const suppressedSet = new Set(suppressed.map((s) => s.leadId));

    const existing = await prisma.sequenceEnrollment.findMany({
      where: { sequenceId, leadId: { in: leads.map((l) => l.id) } },
      select: { leadId: true },
    });
    const existingSet = new Set(existing.map((e) => e.leadId));

    let enrolled = 0;
    let skippedDnc = leadIds.length - leads.length;
    let skippedSuppressed = 0;
    let skippedExisting = 0;

    for (const lead of leads) {
      if (suppressedSet.has(lead.id)) { skippedSuppressed++; continue; }
      if (existingSet.has(lead.id)) { skippedExisting++; continue; }

      await prisma.sequenceEnrollment.create({
        data: { sequenceId, leadId: lead.id, currentStepOrder: 1, status: "ACTIVE", nextSendAt },
      });
      enrolled++;
    }

    return NextResponse.json({
      enrolled,
      skippedDnc,
      skippedSuppressed,
      skippedExisting,
      total: members.length,
    });
  } catch (error) {
    console.error("Failed to bulk enroll:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
