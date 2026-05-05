import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../lib/session";
import { notifyQuestionnaireSubmitted } from "../../../lib/email";

export async function GET(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  if (!(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const q = await prisma.leadQuestionnaire.findUnique({ where: { leadId } });
  if (!q) return NextResponse.json(null);

  // Hide DRAFT questionnaires from the customer (admin still composing)
  if (q.status === "DRAFT") return NextResponse.json(null);

  return NextResponse.json({
    id: q.id,
    title: q.title,
    description: q.description,
    questions: q.questions,
    answers: q.answers,
    status: q.status,
    sentAt: q.sentAt,
    submittedAt: q.submittedAt,
  });
}

export async function PUT(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leadId, answers, submit } = body as {
    leadId?: string;
    answers?: Record<string, unknown>;
    submit?: boolean;
  };
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });
  if (!(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "answers must be an object" }, { status: 400 });
  }

  const q = await prisma.leadQuestionnaire.findUnique({ where: { leadId } });
  if (!q || q.status === "DRAFT") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (q.status === "SUBMITTED") {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 });
  }

  // If submitting: enforce that every required question has an answer
  if (submit) {
    const questions = Array.isArray(q.questions) ? (q.questions as Array<{ id: string; required?: boolean; label?: string }>) : [];
    const missing: string[] = [];
    for (const question of questions) {
      if (question.required) {
        const a = answers[question.id];
        if (a === undefined || a === null || (typeof a === "string" && !a.trim())) {
          missing.push(question.label || question.id);
        }
      }
    }
    if (missing.length > 0) {
      return NextResponse.json({ error: `Please answer the required question${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}` }, { status: 400 });
    }
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, projectName: true, customerName: true },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const updated = await prisma.leadQuestionnaire.update({
    where: { id: q.id },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      answers: answers as any,
      status: submit ? "SUBMITTED" : q.status === "SENT" ? "IN_PROGRESS" : q.status,
      ...(submit && { submittedAt: new Date() }),
    },
  });

  prisma.auditLog
    .create({
      data: {
        leadId,
        action: submit ? "Questionnaire Submitted by Customer" : "Questionnaire Saved by Customer",
        detail: submit
          ? `${session.name} submitted answers to "${q.title}"`
          : `${session.name} saved a draft of "${q.title}"`,
        actor: `${session.name} (Customer)`,
      },
    })
    .catch(() => {});

  if (submit) {
    const questionCount = Array.isArray(q.questions) ? q.questions.length : 0;
    notifyQuestionnaireSubmitted(leadId, lead.projectName, lead.customerName, questionCount).catch(() => {});
  }

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    answers: updated.answers,
    submittedAt: updated.submittedAt,
  });
}
