import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/session";
import { logAudit } from "../../../../../../lib/audit";
import { sendQuestionnaireSentEmail } from "../../../../../../lib/email";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, customerName: true, customerEmail: true, projectName: true, doNotContact: true },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.doNotContact) {
    return NextResponse.json({ error: "Cannot send: Do Not Contact is enabled" }, { status: 403 });
  }

  const q = await prisma.leadQuestionnaire.findUnique({ where: { leadId: id } });
  if (!q) return NextResponse.json({ error: "No questionnaire to send" }, { status: 404 });
  if (q.status === "SUBMITTED") {
    return NextResponse.json({ error: "Questionnaire is already submitted" }, { status: 400 });
  }

  const questions = Array.isArray(q.questions) ? q.questions : [];
  if (questions.length === 0) {
    return NextResponse.json({ error: "Add at least one question before sending" }, { status: 400 });
  }

  // Idempotent re-send: keep status SENT and refresh sentAt
  const updated = await prisma.leadQuestionnaire.update({
    where: { id: q.id },
    data: { status: "SENT", sentAt: new Date(), updatedBy: session.name },
  });

  try {
    await sendQuestionnaireSentEmail(
      { customerName: lead.customerName, customerEmail: lead.customerEmail, projectName: lead.projectName },
      lead.id,
      questions.length,
      { name: session.name }
    );
  } catch (err) {
    console.error("[Questionnaire send] Email failed:", err);
  }

  logAudit(
    id,
    q.sentAt ? "Questionnaire Resent to Customer" : "Questionnaire Sent to Customer",
    `${session.name} sent "${updated.title}" (${questions.length} question${questions.length === 1 ? "" : "s"})`,
    session.name
  ).catch(() => {});

  return NextResponse.json(updated);
}
