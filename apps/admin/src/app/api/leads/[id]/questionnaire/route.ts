import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { logAudit } from "../../../../../lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const q = await prisma.leadQuestionnaire.findUnique({ where: { leadId: id } });
  if (!q) return NextResponse.json(null);
  return NextResponse.json(q);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const existing = await prisma.leadQuestionnaire.findUnique({ where: { leadId: id } });
  if (existing) {
    return NextResponse.json({ error: "Questionnaire already exists for this lead" }, { status: 409 });
  }

  const body = await req.json();
  const { templateId, title, description, questions } = body;

  let resolvedTitle = title?.trim();
  let resolvedDescription = description?.trim() || null;
  let resolvedQuestions = questions ?? [];

  if (templateId) {
    const template = await prisma.questionnaireTemplate.findUnique({ where: { id: templateId } });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    resolvedTitle = resolvedTitle || template.name;
    resolvedDescription = resolvedDescription || template.description;
    if (!questions) resolvedQuestions = template.questions;
  }

  if (!resolvedTitle) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const created = await prisma.leadQuestionnaire.create({
    data: {
      leadId: id,
      templateId: templateId || null,
      title: resolvedTitle,
      description: resolvedDescription,
      questions: resolvedQuestions,
      status: "DRAFT",
      createdBy: session.name,
      updatedBy: session.name,
    },
  });

  logAudit(id, "Questionnaire Created", `${session.name} created "${resolvedTitle}"`, session.name).catch(() => {});

  return NextResponse.json(created, { status: 201 });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.leadQuestionnaire.findUnique({ where: { leadId: id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "SUBMITTED") {
    return NextResponse.json({ error: "Cannot edit a submitted questionnaire" }, { status: 400 });
  }

  const body = await req.json();
  const { title, description, questions } = body;

  const updated = await prisma.leadQuestionnaire.update({
    where: { id: existing.id },
    data: {
      ...(title?.trim() && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(questions !== undefined && { questions }),
      updatedBy: session.name,
    },
  });

  logAudit(id, "Questionnaire Updated", `${session.name} edited "${updated.title}"`, session.name).catch(() => {});

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.leadQuestionnaire.findUnique({ where: { leadId: id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "SUBMITTED") {
    return NextResponse.json({ error: "Cannot delete a submitted questionnaire" }, { status: 400 });
  }

  await prisma.leadQuestionnaire.delete({ where: { id: existing.id } });
  logAudit(id, "Questionnaire Deleted", `${session.name} deleted "${existing.title}"`, session.name).catch(() => {});
  return NextResponse.json({ success: true });
}
