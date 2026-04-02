import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));
  const typeFilter = searchParams.get("type") || "";
  const skip = (page - 1) * limit;

  // Fetch more than needed from each source, then merge and paginate
  const fetchLimit = limit + skip + 10;

  const [receivedEmails, sentEmails, statusChanges, recentNotes, emailOpens, portalVisits] = await Promise.all([
    prisma.receivedEmail.findMany({
      orderBy: { receivedAt: "desc" },
      take: fetchLimit,
      include: {
        lead: { select: { id: true, projectName: true, customerName: true, customerEmail: true } },
      },
    }),
    prisma.sentEmail.findMany({
      orderBy: { createdAt: "desc" },
      take: fetchLimit,
      include: {
        lead: { select: { id: true, projectName: true, customerName: true, customerEmail: true } },
      },
    }),
    prisma.statusHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: fetchLimit,
      include: {
        lead: { select: { id: true, projectName: true, customerName: true, customerEmail: true } },
      },
    }),
    prisma.note.findMany({
      orderBy: { createdAt: "desc" },
      take: fetchLimit,
      include: {
        lead: { select: { id: true, projectName: true, customerName: true, customerEmail: true } },
      },
    }),
    // Email opens — sent emails that have been opened
    prisma.sentEmail.findMany({
      where: { status: "OPENED", openedAt: { not: null } },
      orderBy: { openedAt: "desc" },
      take: fetchLimit,
      include: {
        lead: { select: { id: true, projectName: true, customerName: true, customerEmail: true } },
      },
    }),
    // Customer portal visits
    prisma.customerVisit.findMany({
      orderBy: { createdAt: "desc" },
      take: fetchLimit,
      include: {
        lead: { select: { id: true, projectName: true, customerName: true, customerEmail: true } },
      },
    }),
  ]);

  type ActivityItem = {
    id: string;
    type: "received_email" | "sent_email" | "status_change" | "note" | "email_opened" | "portal_visit";
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

  for (const e of emailOpens) {
    activities.push({
      id: `open-${e.id}`,
      type: "email_opened",
      timestamp: e.openedAt!.toISOString(),
      lead: e.lead,
      data: { subject: e.subject, openedAt: e.openedAt!.toISOString() },
    });
  }

  for (const v of portalVisits) {
    activities.push({
      id: v.id,
      type: "portal_visit",
      timestamp: v.createdAt.toISOString(),
      lead: v.lead,
      data: { visitorName: v.visitorName, visitorEmail: v.visitorEmail, page: v.page },
    });
  }

  // Filter by type if requested
  const filtered = typeFilter
    ? activities.filter((a) => a.type === typeFilter)
    : activities;

  // Sort by timestamp descending
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Paginate
  const paginated = filtered.slice(skip, skip + limit);
  const hasMore = filtered.length > skip + limit;

  return NextResponse.json({
    activities: paginated,
    pagination: { page, limit, hasMore, total: filtered.length },
  });
}
