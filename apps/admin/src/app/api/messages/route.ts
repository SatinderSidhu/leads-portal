import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "1";

  // Get all leads assigned to or watched by this admin
  const myLeadIds = await prisma.lead.findMany({
    where: {
      OR: [
        { assignedToId: session.id },
        { watchers: { some: { adminId: session.id } } },
      ],
    },
    select: { id: true },
  });
  const leadIds = myLeadIds.map((l) => l.id);

  if (unreadOnly) {
    // Count unread customer messages
    const unreadCount = await prisma.message.count({
      where: {
        leadId: { in: leadIds },
        senderType: "customer",
        readAt: null,
      },
    });

    // Get unread messages grouped by lead
    const unreadMessages = await prisma.message.findMany({
      where: {
        leadId: { in: leadIds },
        senderType: "customer",
        readAt: null,
      },
      include: {
        lead: {
          select: { id: true, projectName: true, customerName: true, customerEmail: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ unreadCount, messages: unreadMessages });
  }

  // All recent messages across my leads
  const messages = await prisma.message.findMany({
    where: { leadId: { in: leadIds } },
    include: {
      lead: {
        select: { id: true, projectName: true, customerName: true, customerEmail: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Group by lead with unread count
  const leadMap = new Map<string, {
    leadId: string;
    projectName: string;
    customerName: string;
    lastMessage: string;
    lastMessageAt: string;
    lastSenderType: string;
    unreadCount: number;
    totalMessages: number;
  }>();

  for (const msg of messages) {
    if (!msg.lead) continue;
    const existing = leadMap.get(msg.lead.id);
    if (existing) {
      existing.totalMessages++;
      if (msg.senderType === "customer" && !msg.readAt) existing.unreadCount++;
    } else {
      leadMap.set(msg.lead.id, {
        leadId: msg.lead.id,
        projectName: msg.lead.projectName,
        customerName: msg.lead.customerName,
        lastMessage: msg.content.slice(0, 100),
        lastMessageAt: msg.createdAt.toISOString(),
        lastSenderType: msg.senderType,
        unreadCount: msg.senderType === "customer" && !msg.readAt ? 1 : 0,
        totalMessages: 1,
      });
    }
  }

  const conversations = Array.from(leadMap.values())
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return NextResponse.json({ conversations });
}
