import { prisma } from "@leads-portal/database";
import type { MembershipSource } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "25", 10);
  const search = searchParams.get("search");

  const leadWhere = search
    ? { OR: [
        { customerName: { contains: search, mode: "insensitive" as const } },
        { customerEmail: { contains: search, mode: "insensitive" as const } },
        { companyName: { contains: search, mode: "insensitive" as const } },
      ] }
    : undefined;

  try {
    const [members, total] = await Promise.all([
      prisma.listMembership.findMany({
        where: { listId: id, ...(leadWhere ? { lead: leadWhere } : {}) },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { addedAt: "desc" },
        include: {
          lead: {
            select: { id: true, customerName: true, customerEmail: true, companyName: true, jobTitle: true, industry: true, stage: true, source: true },
          },
        },
      }),
      prisma.listMembership.count({ where: { listId: id, ...(leadWhere ? { lead: leadWhere } : {}) } }),
    ]);

    return NextResponse.json({
      members,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { leadIds?: string[]; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { leadIds, source } = body;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: "leadIds array is required" }, { status: 400 });
  }

  try {
    const list = await prisma.contactList.findUnique({ where: { id }, select: { id: true, type: true } });
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });
    if (list.type === "DYNAMIC") {
      return NextResponse.json({ error: "Cannot manually add members to a dynamic list" }, { status: 400 });
    }

    // Check existing members
    const existing = await prisma.listMembership.findMany({
      where: { listId: id, leadId: { in: leadIds } },
      select: { leadId: true },
    });
    const existingSet = new Set(existing.map((e) => e.leadId));

    let added = 0;
    let skipped = 0;
    for (const leadId of leadIds) {
      if (existingSet.has(leadId)) { skipped++; continue; }
      await prisma.listMembership.create({
        data: {
          listId: id,
          leadId,
          source: (source as MembershipSource) || "MANUAL",
          addedBy: session.name,
        },
      });
      added++;

      // Auto-enroll in triggered sequences
      await autoEnrollFromList(id, leadId);
    }

    return NextResponse.json({ added, skipped }, { status: 201 });
  } catch (error) {
    console.error("Failed to add members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "leadId query param required" }, { status: 400 });

  try {
    await prisma.listMembership.deleteMany({ where: { listId: id, leadId } });

    // If this is a suppression list removal, no sequence action needed
    // (suppression check happens at enrollment time)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * When a contact is added to a list, check if any active sequence uses
 * this list as an enrollment trigger and auto-enroll the contact.
 */
async function autoEnrollFromList(listId: string, leadId: string) {
  try {
    // Check if lead is on any suppression list
    const suppressed = await prisma.listMembership.findFirst({
      where: { leadId, list: { isSuppression: true } },
    });
    if (suppressed) return;

    // Check doNotContact
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { doNotContact: true } });
    if (lead?.doNotContact) return;

    // Find sequences triggered by this list
    const sequences = await prisma.smartSequence.findMany({
      where: { triggerListId: listId, enrollmentTrigger: "ADDED_TO_LIST", status: "ACTIVE" },
      include: { steps: { orderBy: { stepOrder: "asc" }, take: 1 } },
    });

    for (const seq of sequences) {
      // Check not already enrolled
      const existing = await prisma.sequenceEnrollment.findFirst({
        where: { sequenceId: seq.id, leadId },
      });
      if (existing) continue;

      if (seq.steps.length === 0) continue;

      const firstStep = seq.steps[0];
      const now = new Date();
      const nextSendAt = new Date(now);
      if (firstStep.waitUnit === "HOURS") nextSendAt.setHours(nextSendAt.getHours() + firstStep.waitValue);
      else if (firstStep.waitUnit === "DAYS") nextSendAt.setDate(nextSendAt.getDate() + firstStep.waitValue);
      else if (firstStep.waitUnit === "WEEKS") nextSendAt.setDate(nextSendAt.getDate() + firstStep.waitValue * 7);

      await prisma.sequenceEnrollment.create({
        data: {
          sequenceId: seq.id,
          leadId,
          currentStepOrder: 1,
          status: "ACTIVE",
          nextSendAt: firstStep.waitValue === 0 ? now : nextSendAt,
        },
      });
    }
  } catch (error) {
    console.error("Auto-enroll from list failed:", error);
  }
}
