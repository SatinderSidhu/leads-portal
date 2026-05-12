import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/session";
import { sanitizeRequirementHtml } from "../../../../lib/requirement-html";
import type { RequirementPriority } from "@prisma/client";

const VALID_PRIORITIES: RequirementPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

async function loadAuthorized(reqId: string, leadIds: string[]) {
  const row = await prisma.requirement.findUnique({ where: { id: reqId } });
  if (!row || !leadIds.includes(row.leadId)) return null;
  return row;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await loadAuthorized(id, session.leadIds as string[]);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, description, priority } = body as {
    title?: string;
    description?: string | null;
    priority?: string;
  };

  const data: Record<string, unknown> = {};
  if (typeof title === "string") {
    if (!title.trim()) return NextResponse.json({ error: "Title can't be empty" }, { status: 400 });
    data.title = title.trim();
  }
  if (description !== undefined) {
    data.description = description ? sanitizeRequirementHtml(description) || null : null;
  }
  if (typeof priority === "string" && VALID_PRIORITIES.includes(priority as RequirementPriority)) {
    data.priority = priority as RequirementPriority;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.requirement.update({ where: { id: row.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await loadAuthorized(id, session.leadIds as string[]);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cascade handles children via the FK relation.
  await prisma.requirement.delete({ where: { id: row.id } });

  prisma.auditLog
    .create({
      data: {
        leadId: row.leadId,
        action: "Requirement Removed by Customer",
        detail: `${session.name} removed ${row.type.toLowerCase().replace("_", " ")}: "${row.title}"`,
        actor: `${session.name} (Customer)`,
      },
    })
    .catch(() => {});

  return NextResponse.json({ success: true });
}
