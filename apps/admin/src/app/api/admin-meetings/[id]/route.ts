import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";
import type { MeetingBookingStatus } from "@prisma/client";

const VALID_STATUS: MeetingBookingStatus[] = ["CONFIRMED", "CANCELLED", "COMPLETED"];

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { status, conferencingLink, notes } = body as {
    status?: string;
    conferencingLink?: string | null;
    notes?: string | null;
  };
  if (status && !VALID_STATUS.includes(status as MeetingBookingStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const updated = await prisma.meetingBooking.update({
    where: { id },
    data: {
      ...(status && { status: status as MeetingBookingStatus }),
      ...(conferencingLink !== undefined && { conferencingLink: conferencingLink?.trim() || null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
    },
  });
  return NextResponse.json(updated);
}
