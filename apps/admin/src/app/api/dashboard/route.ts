import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalLeads,
    myLeads,
    newLeadsToday,
    newLeadsThisWeek,
    statusCounts,
    // Recent customer activity (last 24h) — emails opened, portal visits, comments
    recentEmailOpens,
    recentPortalVisits,
    recentCustomerComments,
    recentReceivedEmails,
    // Needs attention: leads with recent customer activity that admin should act on
    leadsWithRecentActivity,
    // Pipeline stats
    activeLeads,
    closedLeads,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { assignedToId: session.id } }),
    prisma.lead.count({ where: { createdAt: { gte: today } } }),
    prisma.lead.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.sentEmail.count({ where: { status: "OPENED", openedAt: { gte: dayAgo } } }),
    prisma.customerVisit.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.note.count({ where: { createdAt: { gte: dayAgo }, createdBy: { endsWith: "(Customer)" } } }),
    prisma.receivedEmail.count({ where: { receivedAt: { gte: dayAgo } } }),
    // Leads needing attention: recent audit log entries from customer actions
    prisma.auditLog.findMany({
      where: {
        createdAt: { gte: weekAgo },
        action: {
          in: [
            "Email Opened by Customer",
            "Customer Portal Visit",
            "Customer Comment Added",
            "SOW Signed",
            "NDA Signed",
          ],
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            projectName: true,
            customerName: true,
            customerEmail: true,
            status: true,
            stage: true,
            assignedTo: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.lead.count({
      where: {
        status: {
          notIn: ["LOST", "NO_RESPONSE", "ON_HOLD", "CANCELLED", "GO_LIVE"],
        },
      },
    }),
    prisma.lead.count({
      where: {
        status: { in: ["LOST", "NO_RESPONSE", "ON_HOLD", "CANCELLED"] },
      },
    }),
  ]);

  // My pending tasks (assigned to current admin, not completed)
  const myPendingTasks = await prisma.nextStep.findMany({
    where: {
      assignedToId: session.id,
      completed: false,
    },
    include: {
      lead: {
        select: {
          id: true,
          projectName: true,
          customerName: true,
          status: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 20,
  });

  // Deduplicate attention leads (group by leadId, keep latest activity)
  const attentionMap = new Map<string, {
    leadId: string;
    projectName: string;
    customerName: string;
    status: string;
    assignedTo: string | null;
    lastAction: string;
    lastDetail: string | null;
    lastActor: string | null;
    lastActivityAt: string;
    activityCount: number;
  }>();

  for (const log of leadsWithRecentActivity) {
    if (!log.lead) continue;
    const existing = attentionMap.get(log.lead.id);
    if (existing) {
      existing.activityCount++;
    } else {
      attentionMap.set(log.lead.id, {
        leadId: log.lead.id,
        projectName: log.lead.projectName,
        customerName: log.lead.customerName,
        status: log.lead.status,
        assignedTo: log.lead.assignedTo?.name || null,
        lastAction: log.action,
        lastDetail: log.detail,
        lastActor: log.actor,
        lastActivityAt: log.createdAt.toISOString(),
        activityCount: 1,
      });
    }
  }

  const needsAttention = Array.from(attentionMap.values())
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

  // Status distribution for pipeline
  const statusDistribution: Record<string, number> = {};
  for (const s of statusCounts) {
    statusDistribution[s.status] = s._count;
  }

  return NextResponse.json({
    admin: { name: session.name, id: session.id },
    stats: {
      totalLeads,
      myLeads,
      newLeadsToday,
      newLeadsThisWeek,
      activeLeads,
      closedLeads,
      recentEmailOpens,
      recentPortalVisits,
      recentCustomerComments,
      recentReceivedEmails,
      needsAttentionCount: needsAttention.length,
      myPendingTasksCount: myPendingTasks.length,
    },
    needsAttention,
    myTasks: myPendingTasks.map((t) => ({
      id: t.id,
      content: t.content,
      dueDate: t.dueDate?.toISOString() || null,
      createdBy: t.createdBy,
      createdAt: t.createdAt.toISOString(),
      leadId: t.lead.id,
      projectName: t.lead.projectName,
      customerName: t.lead.customerName,
      leadStatus: t.lead.status,
    })),
    statusDistribution,
  });
}
