import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { calculateNextSendAt } from "../../../../../lib/sequence-utils";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "25", 10);

  try {
    const where: Record<string, unknown> = { sequenceId: id };
    if (status) where.status = status;

    const [enrollments, total] = await Promise.all([
      prisma.sequenceEnrollment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { enrolledAt: "desc" },
        include: {
          lead: { select: { id: true, customerName: true, customerEmail: true, projectName: true, stage: true, companyName: true } },
        },
      }),
      prisma.sequenceEnrollment.count({ where }),
    ]);

    return NextResponse.json({
      enrollments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Failed to fetch enrollments:", error);
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
  let body: { leadIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { leadIds } = body;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: "leadIds array is required" }, { status: 400 });
  }

  try {
    // Load sequence and first step
    const sequence = await prisma.smartSequence.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepOrder: "asc" }, take: 1 } },
    });
    if (!sequence) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    if (sequence.steps.length === 0) {
      return NextResponse.json({ error: "Sequence has no steps" }, { status: 400 });
    }

    const firstStep = sequence.steps[0];
    const now = new Date();
    const nextSendAt = firstStep.stepOrder === 1 && firstStep.waitValue === 0
      ? now
      : calculateNextSendAt(firstStep.waitValue, firstStep.waitUnit, now);

    // Load leads, skip doNotContact
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds }, doNotContact: false },
      select: { id: true, customerName: true },
    });

    // Check for existing enrollments
    const existing = await prisma.sequenceEnrollment.findMany({
      where: { sequenceId: id, leadId: { in: leads.map((l) => l.id) } },
      select: { leadId: true },
    });
    const existingSet = new Set(existing.map((e) => e.leadId));

    let enrolled = 0;
    let skipped = 0;
    for (const lead of leads) {
      if (existingSet.has(lead.id)) {
        skipped++;
        continue;
      }
      await prisma.sequenceEnrollment.create({
        data: {
          sequenceId: id,
          leadId: lead.id,
          currentStepOrder: 1,
          status: "ACTIVE",
          nextSendAt,
        },
      });
      enrolled++;
    }

    const blocked = leadIds.length - leads.length;
    return NextResponse.json({ enrolled, skipped, blocked }, { status: 201 });
  } catch (error) {
    console.error("Failed to enroll contacts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
