import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));

  const [receivedEmails, sentEmails, statusChanges, recentNotes] = await Promise.all([
    prisma.receivedEmail.findMany({
      orderBy: { receivedAt: "desc" },
      take: limit,
      include: {
        lead: { select: { id: true, projectName: true, customerName: true, customerEmail: true } },
      },
    }),
    prisma.sentEmail.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        lead: { select: { id: true, projectName: true, customerName: true, customerEmail: true } },
      },
    }),
    prisma.statusHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        lead: { select: { id: true, projectName: true, customerName: true, customerEmail: true } },
      },
    }),
    prisma.note.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        lead: { select: { id: true, projectName: true, customerName: true, customerEmail: true } },
      },
    }),
  ]);

  // Merge into a unified activity feed
  type ActivityItem = {
    id: string;
    type: "received_email" | "sent_email" | "status_change" | "note";
    timestamp: string;
    lead: { id: string; projectName: string; customerName: string; customerEmail: string };
    data: Record<string, unknown>;
  };

  const activities: ActivityItem[] = [];

  for (const e of receivedEmails) {
    activities.push({
      id: e.id,
      type: "received_email",
      timestamp: e.receivedAt.toISOString(),
      lead: e.lead,
      data: { fromEmail: e.fromEmail, fromName: e.fromName, subject: e.subject },
    });
  }

  for (const e of sentEmails) {
    activities.push({
      id: e.id,
      type: "sent_email",
      timestamp: e.createdAt.toISOString(),
      lead: e.lead,
      data: { subject: e.subject, sentBy: e.sentBy, status: e.status },
    });
  }

  for (const s of statusChanges) {
    activities.push({
      id: s.id,
      type: "status_change",
      timestamp: s.createdAt.toISOString(),
      lead: s.lead,
      data: { fromStatus: s.fromStatus, toStatus: s.toStatus, changedBy: s.changedBy },
    });
  }

  for (const n of recentNotes) {
    activities.push({
      id: n.id,
      type: "note",
      timestamp: n.createdAt.toISOString(),
      lead: n.lead,
      data: { content: n.content, createdBy: n.createdBy },
    });
  }

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json(activities.slice(0, limit));
}
