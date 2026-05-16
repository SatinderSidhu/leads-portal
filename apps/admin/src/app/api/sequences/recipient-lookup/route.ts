import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";

/**
 * Look up every sequence email a recipient has received.
 *
 * Why this exists: sales/support reps want to answer "how many automated
 * touches has this contact already received?" without paging through the
 * lead detail. The email address is the only identifier they typically
 * have on hand.
 *
 * Returns one entry per matching lead (an email may exist on the primary
 * lead.customerEmail AND on one or more LeadContact secondary contacts).
 */
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email query param required" }, { status: 400 });
  }

  // Match on primary lead email OR any secondary contact email — both surfaces
  // receive automated mail (via getLeadCcEmails + manual compose).
  const leadsByPrimary = await prisma.lead.findMany({
    where: { customerEmail: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      companyName: true,
    },
  });
  const leadsBySecondary = await prisma.lead.findMany({
    where: {
      contacts: {
        some: { email: { equals: email, mode: "insensitive" } },
      },
    },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      companyName: true,
    },
  });
  const leadMap = new Map<string, { id: string; customerName: string; customerEmail: string; companyName: string | null }>();
  for (const l of [...leadsByPrimary, ...leadsBySecondary]) leadMap.set(l.id, l);
  const leadIds = Array.from(leadMap.keys());

  if (leadIds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Pull every sequence-originated SentEmail for these leads. enrollmentId
  // non-null is the sequence marker. Then enrich each with its sequence name
  // via a single follow-up query (SentEmail has no formal Prisma relation
  // to SequenceEnrollment — just an enrollmentId column).
  const sentEmails = await prisma.sentEmail.findMany({
    where: { leadId: { in: leadIds }, enrollmentId: { not: null } },
    select: {
      id: true,
      leadId: true,
      enrollmentId: true,
      enrollmentStep: true,
      subject: true,
      status: true,
      openedAt: true,
      clickedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const enrollmentIds = Array.from(new Set(sentEmails.map((e) => e.enrollmentId!).filter(Boolean)));
  const enrollments = enrollmentIds.length === 0
    ? []
    : await prisma.sequenceEnrollment.findMany({
        where: { id: { in: enrollmentIds } },
        select: {
          id: true,
          leadId: true,
          sequenceId: true,
          status: true,
          currentStepOrder: true,
          lastAction: true,
          enrolledAt: true,
          exitReason: true,
          sequence: { select: { id: true, name: true } },
        },
      });
  // Also pull *current* enrollments (even those without sent emails yet)
  // so the lookup reflects active state, not just historical sends.
  const liveEnrollments = await prisma.sequenceEnrollment.findMany({
    where: { leadId: { in: leadIds } },
    select: {
      id: true,
      leadId: true,
      sequenceId: true,
      status: true,
      currentStepOrder: true,
      lastAction: true,
      enrolledAt: true,
      exitReason: true,
      sequence: { select: { id: true, name: true } },
    },
  });
  const enrollmentByIdAll = new Map([...enrollments, ...liveEnrollments].map((en) => [en.id, en]));

  // Group results per lead.
  const results = Array.from(leadMap.values()).map((lead) => {
    const myEnrollments = liveEnrollments.filter((en) => en.leadId === lead.id);
    const myEmails = sentEmails.filter((e) => e.leadId === lead.id);

    const bySequenceMap = new Map<string, { sequenceId: string; sequenceName: string; count: number; lastSentAt: string | null }>();
    for (const e of myEmails) {
      if (!e.enrollmentId) continue;
      const en = enrollmentByIdAll.get(e.enrollmentId);
      if (!en) continue;
      const key = en.sequenceId;
      const existing = bySequenceMap.get(key);
      if (existing) {
        existing.count++;
        if (!existing.lastSentAt || new Date(e.createdAt) > new Date(existing.lastSentAt)) {
          existing.lastSentAt = e.createdAt.toISOString();
        }
      } else {
        bySequenceMap.set(key, {
          sequenceId: en.sequenceId,
          sequenceName: en.sequence.name,
          count: 1,
          lastSentAt: e.createdAt.toISOString(),
        });
      }
    }

    return {
      lead,
      enrollments: myEnrollments.map((en) => ({
        sequenceId: en.sequenceId,
        sequenceName: en.sequence.name,
        status: en.status,
        currentStepOrder: en.currentStepOrder,
        lastAction: en.lastAction,
        enrolledAt: en.enrolledAt.toISOString(),
        exitReason: en.exitReason,
      })),
      bySequence: Array.from(bySequenceMap.values()).sort((a, b) => (b.lastSentAt || "").localeCompare(a.lastSentAt || "")),
      totalSequenceEmails: myEmails.length,
    };
  });

  return NextResponse.json({ results });
}
