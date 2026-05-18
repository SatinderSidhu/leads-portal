import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "upcoming";

  const now = new Date();
  const where =
    filter === "past"
      ? { startsAt: { lt: now } }
      : filter === "all"
        ? {}
        : { startsAt: { gte: now }, status: { in: ["CONFIRMED" as const] } };

  const bookings = await prisma.meetingBooking.findMany({
    where,
    orderBy: { startsAt: filter === "past" ? "desc" : "asc" },
    include: {
      meetingType: { select: { name: true, durationMin: true } },
      lead: { select: { id: true, customerName: true, projectName: true } },
    },
    take: 200,
  });
  return NextResponse.json(bookings);
}
