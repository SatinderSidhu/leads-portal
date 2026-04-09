import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { buildPrismaWhereFromFilters, type FilterRule } from "../../../../../lib/list-utils";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const list = await prisma.contactList.findUnique({ where: { id } });
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });
    if (list.type !== "DYNAMIC") {
      return NextResponse.json({ error: "Only dynamic lists can be refreshed" }, { status: 400 });
    }

    const filters = list.filters as FilterRule[];
    const where = buildPrismaWhereFromFilters(filters);

    // Find all matching leads
    const matchingLeads = await prisma.lead.findMany({
      where,
      select: { id: true },
    });
    const matchingIds = new Set(matchingLeads.map((l) => l.id));

    // Get current members
    const currentMembers = await prisma.listMembership.findMany({
      where: { listId: id },
      select: { id: true, leadId: true },
    });
    const currentIds = new Set(currentMembers.map((m) => m.leadId));

    // Add new matches
    const toAdd = [...matchingIds].filter((lid) => !currentIds.has(lid));
    let added = 0;
    for (const leadId of toAdd) {
      await prisma.listMembership.create({
        data: { listId: id, leadId, source: "RULE", addedBy: "System (Dynamic Refresh)" },
      });
      added++;

      // Auto-enroll in triggered sequences
      // Check suppression first
      const suppressed = await prisma.listMembership.findFirst({
        where: { leadId, list: { isSuppression: true } },
      });
      if (suppressed) continue;

      const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { doNotContact: true } });
      if (lead?.doNotContact) continue;

      const sequences = await prisma.smartSequence.findMany({
        where: { triggerListId: id, enrollmentTrigger: "ADDED_TO_LIST", status: "ACTIVE" },
        include: { steps: { orderBy: { stepOrder: "asc" }, take: 1 } },
      });

      for (const seq of sequences) {
        const existing = await prisma.sequenceEnrollment.findFirst({ where: { sequenceId: seq.id, leadId } });
        if (existing || seq.steps.length === 0) continue;

        const firstStep = seq.steps[0];
        const now = new Date();
        const nextSendAt = new Date(now);
        if (firstStep.waitUnit === "HOURS") nextSendAt.setHours(nextSendAt.getHours() + firstStep.waitValue);
        else if (firstStep.waitUnit === "DAYS") nextSendAt.setDate(nextSendAt.getDate() + firstStep.waitValue);
        else if (firstStep.waitUnit === "WEEKS") nextSendAt.setDate(nextSendAt.getDate() + firstStep.waitValue * 7);

        await prisma.sequenceEnrollment.create({
          data: { sequenceId: seq.id, leadId, currentStepOrder: 1, status: "ACTIVE", nextSendAt: firstStep.waitValue === 0 ? now : nextSendAt },
        });
      }
    }

    // Remove members who no longer match
    const toRemove = currentMembers.filter((m) => !matchingIds.has(m.leadId));
    let removed = 0;
    if (toRemove.length > 0) {
      await prisma.listMembership.deleteMany({
        where: { id: { in: toRemove.map((m) => m.id) } },
      });
      removed = toRemove.length;
    }
    // Note: enrollment decoupling rule — removing from list does NOT affect active sequences

    // Update last refreshed timestamp
    await prisma.contactList.update({
      where: { id },
      data: { lastRefreshedAt: new Date() },
    });

    return NextResponse.json({
      totalMatching: matchingIds.size,
      added,
      removed,
      unchanged: matchingIds.size - added,
    });
  } catch (error) {
    console.error("Failed to refresh list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
