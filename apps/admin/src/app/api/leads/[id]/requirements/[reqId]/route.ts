import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/session";
import { logAudit } from "../../../../../../lib/audit";
import { sanitizeRequirementHtml } from "../../../../../../lib/requirement-html";
import type { RequirementPriority } from "@prisma/client";

const VALID_PRIORITIES: RequirementPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: leadId, reqId } = await params;
  const row = await prisma.requirement.findUnique({ where: { id: reqId } });
  if (!row || row.leadId !== leadId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: leadId, reqId } = await params;
  const row = await prisma.requirement.findUnique({ where: { id: reqId } });
  if (!row || row.leadId !== leadId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.requirement.delete({ where: { id: row.id } });

  logAudit(
    leadId,
    "Requirement Removed",
    `${session.name} removed ${row.type.toLowerCase().replace("_", " ")}: "${row.title}"`,
    session.name,
  ).catch(() => {});

  return NextResponse.json({ success: true });
}
