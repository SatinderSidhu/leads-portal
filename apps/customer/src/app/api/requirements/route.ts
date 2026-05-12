import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../lib/session";
import { sanitizeRequirementHtml } from "../../../lib/requirement-html";
import type { RequirementType, RequirementPriority } from "@prisma/client";

const VALID_TYPES: RequirementType[] = ["EPIC", "FEATURE", "USER_STORY"];
const VALID_PRIORITIES: RequirementPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export async function GET(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = new URL(req.url).searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });
  if (!(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await prisma.requirement.findMany({
    where: { leadId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leadId, parentId, type, title, description, priority } = body as {
    leadId?: string;
    parentId?: string | null;
    type?: string;
    title?: string;
    description?: string;
    priority?: string;
  };

  if (!leadId || !(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!type || !VALID_TYPES.includes(type as RequirementType)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const pri = priority && VALID_PRIORITIES.includes(priority as RequirementPriority)
    ? (priority as RequirementPriority)
    : "MEDIUM";

  // Hierarchy enforcement. Epic = no parent; Feature parent must be Epic on
  // the same lead; User Story parent must be Feature on the same lead.
  const validParent = await validateParent(leadId, type as RequirementType, parentId ?? null);
  if (validParent.error) {
    return NextResponse.json({ error: validParent.error }, { status: 400 });
  }

  // Append to the end of siblings by default.
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
      createdByType: "customer",
    },
  });

  prisma.auditLog
    .create({
      data: {
        leadId,
        action: "Requirement Added by Customer",
        detail: `${session.name} added ${row.type.toLowerCase().replace("_", " ")}: "${row.title}"`,
        actor: `${session.name} (Customer)`,
      },
    })
    .catch(() => {});

  return NextResponse.json(row, { status: 201 });
}

async function validateParent(
  leadId: string,
  type: RequirementType,
  parentId: string | null,
): Promise<{ error?: string }> {
  if (type === "EPIC") {
    if (parentId) return { error: "Epics can't have a parent" };
    return {};
  }
  if (!parentId) {
    return { error: `${type === "FEATURE" ? "Feature" : "User Story"} needs a parent` };
  }
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
