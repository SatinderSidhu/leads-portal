import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAvailableSlots, listAvailableDays, BUSINESS_TZ } from "../../../../lib/meeting-slots";

// Public. Used by the booking flow to populate the date picker (when no
// date is passed) and then the time slots (once a date is chosen).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const typeId = url.searchParams.get("typeId");
  const dateStr = url.searchParams.get("date");

  if (!typeId) {
    return NextResponse.json({ error: "typeId is required" }, { status: 400 });
  }

  const type = await prisma.meetingType.findUnique({
    where: { id: typeId },
    select: { id: true, durationMin: true, isActive: true },
  });
  if (!type || !type.isActive) {
    return NextResponse.json({ error: "Meeting type not available" }, { status: 404 });
  }

  if (!dateStr) {
    return NextResponse.json({
      days: listAvailableDays(),
      businessTimezone: BUSINESS_TZ,
    });
  }

  const slots = await getAvailableSlots(type.durationMin, dateStr);
  return NextResponse.json({ date: dateStr, slots, businessTimezone: BUSINESS_TZ });
}
