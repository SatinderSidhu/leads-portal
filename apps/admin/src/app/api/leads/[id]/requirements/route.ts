import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { logAudit } from "../../../../../lib/audit";
import { sanitizeRequirementHtml } from "../../../../../lib/requirement-html";
import type { RequirementType, RequirementPriority } from "@prisma/client";

const VALID_TYPES: RequirementType[] = ["EPIC", "FEATURE", "USER_STORY"];
const VALID_PRIORITIES: RequirementPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rows = await prisma.requirement.findMany({
    where: { leadId: id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: leadId } = await params;
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const body = await req.json();
  const { parentId, type, title, description, priority } = body as {
    parentId?: string | null;
    type?: string;
    title?: string;
    description?: string;
    priority?: string;
  };

  if (!type || !VALID_TYPES.includes(type as RequirementType)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const pri = priority && VALID_PRIORITIES.includes(priority as RequirementPriority)
    ? (priority as RequirementPriority)
    : "MEDIUM";

  // Hierarchy enforcement — same rules as the customer endpoint.
  const valid = await validateParent(leadId, type as RequirementType, parentId ?? null);
  if (valid.error) return NextResponse.json({ error: valid.error }, { status: 400 });

  const lastSibling = await prisma.requirement.findFirst({
    where: { leadId, parentId: parentId ?? null, type: type as RequirementType },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (lastSibling?.sortOrder ?? -1) + 1;

  const row = await prisma.requirement.create({
    data: {
      leadId,
      parentId: parentId ?? null,
      type: type as RequirementType,
      title: title.trim(),
      description: sanitizeRequirementHtml(description) || null,
      priority: pri,
      sortOrder,
      createdBy: session.name,
      createdByType: "admin",
    },
  });

  logAudit(
    leadId,
    "Requirement Added",
    `${session.name} added ${row.type.toLowerCase().replace("_", " ")}: "${row.title}"`,
    session.name,
  ).catch(() => {});

  return NextResponse.json(row, { status: 201 });
}

async function validateParent(
  leadId: string,
  type: RequirementType,
  parentId: string | null,
): Promise<{ error?: string }> {
  // Epics never have a parent.
  if (type === "EPIC") {
    if (parentId) return { error: "Epics can't have a parent" };
    return {};
  }
  // Features and User Stories MAY have a parent — but it's optional.
  // Items added without a parent show up at the top level alongside Epics.
  if (!parentId) return {};

  const parent = await prisma.requirement.findUnique({
    where: { id: parentId },
    select: { id: true, leadId: true, type: true },
  });
  if (!parent || parent.leadId !== leadId) {
    return { error: "Parent not found" };
  }
  if (type === "FEATURE" && parent.type !== "EPIC") {
    return { error: "Features must be under an Epic" };
  }
  if (type === "USER_STORY" && parent.type !== "FEATURE") {
    return { error: "User Stories must be under a Feature" };
  }
  return {};
}
