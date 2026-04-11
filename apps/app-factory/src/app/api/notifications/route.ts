import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getSession } from "../../../lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "1";

  try {
    const where: Record<string, unknown> = { userId: session.id };
    if (unreadOnly) where.readAt = null;

    const [notifications, unreadCount] = await Promise.all([
      prisma.customerNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.customerNotification.count({
        where: { userId: session.id, readAt: null },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Mark notifications as read
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { notificationIds, markAllRead } = body as { notificationIds?: string[]; markAllRead?: boolean };

  try {
    if (markAllRead) {
      await prisma.customerNotification.updateMany({
        where: { userId: session.id, readAt: null },
        data: { readAt: new Date() },
      });
    } else if (notificationIds?.length) {
      await prisma.customerNotification.updateMany({
        where: { id: { in: notificationIds }, userId: session.id },
        data: { readAt: new Date() },
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
