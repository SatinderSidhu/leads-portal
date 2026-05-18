import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { notifyMeetingBooked, sendMeetingConfirmation } from "../../../../lib/email";

// Public. The client posts a confirmed-and-validated slot back; we
// re-validate the slot is still free at write time to avoid double-booking.
export async function POST(req: Request) {
  let body: {
    typeId?: string;
    startsAt?: string; // ISO UTC
    attendeeName?: string;
    attendeeEmail?: string;
    attendeePhone?: string;
    notes?: string;
    leadId?: string;
    timezone?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const {
    typeId,
    startsAt,
    attendeeName,
    attendeeEmail,
    attendeePhone,
    notes,
    leadId,
    timezone,
  } = body;

  if (!typeId || !startsAt || !attendeeName?.trim() || !attendeeEmail?.trim()) {
    return NextResponse.json(
      { error: "typeId, startsAt, attendeeName and attendeeEmail are required" },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail.trim())) {
    return NextResponse.json({ error: "Email looks invalid" }, { status: 400 });
  }

  const type = await prisma.meetingType.findUnique({
    where: { id: typeId },
    select: { id: true, name: true, durationMin: true, isActive: true },
  });
  if (!type || !type.isActive) {
    return NextResponse.json({ error: "Meeting type not available" }, { status: 404 });
  }

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
  }
  const end = new Date(start.getTime() + type.durationMin * 60 * 1000);

  // Double-book guard. We don't lock the meeting_bookings row here; we
  // rely on a quick overlap check. For v1 traffic this is fine. If two
  // customers race for the same slot, the second write succeeds at the
  // DB level and the admin sees both — better than the alternative of
  // requiring a SERIALIZABLE transaction for a thin client flow.
  const overlap = await prisma.meetingBooking.findFirst({
    where: {
      status: { in: ["CONFIRMED", "COMPLETED"] },
      startsAt: { lt: end },
      endsAt: { gt: start },
    },
    select: { id: true },
  });
  if (overlap) {
    return NextResponse.json(
      { error: "That slot was just taken — please pick another." },
      { status: 409 }
    );
  }

  // Validate the lead if one was passed (email-campaign deep links).
  // A bad / missing leadId is non-fatal — store the booking unlinked.
  let resolvedLeadId: string | null = null;
  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, projectName: true, doNotContact: true },
    });
    if (lead && !lead.doNotContact) resolvedLeadId = lead.id;
  }

  const booking = await prisma.meetingBooking.create({
    data: {
      meetingTypeId: type.id,
      leadId: resolvedLeadId,
      attendeeName: attendeeName.trim(),
      attendeeEmail: attendeeEmail.trim().toLowerCase(),
      attendeePhone: attendeePhone?.trim() || null,
      notes: notes?.trim() || null,
      startsAt: start,
      endsAt: end,
      timezone: timezone || null,
    },
  });

  // Audit + email (non-blocking).
  if (resolvedLeadId) {
    prisma.auditLog
      .create({
        data: {
          leadId: resolvedLeadId,
          action: "Meeting Booked",
          detail: `${booking.attendeeName} booked ${type.name} (${type.durationMin} min) for ${start.toISOString()}`,
          actor: `${booking.attendeeName} (Customer)`,
        },
      })
      .catch(() => {});
  }

  sendMeetingConfirmation({
    bookingId: booking.id,
    attendeeName: booking.attendeeName,
    attendeeEmail: booking.attendeeEmail,
    meetingTypeName: type.name,
    durationMin: type.durationMin,
    startsAt: booking.startsAt,
    timezone: booking.timezone,
  }).catch((err) => console.error("[meeting] sendMeetingConfirmation failed:", err));

  notifyMeetingBooked({
    bookingId: booking.id,
    leadId: resolvedLeadId,
    attendeeName: booking.attendeeName,
    attendeeEmail: booking.attendeeEmail,
    attendeePhone: booking.attendeePhone,
    meetingTypeName: type.name,
    durationMin: type.durationMin,
    startsAt: booking.startsAt,
    notes: booking.notes,
  }).catch((err) => console.error("[meeting] notifyMeetingBooked failed:", err));

  return NextResponse.json(
    {
      id: booking.id,
      meetingTypeName: type.name,
      durationMin: type.durationMin,
      startsAt: booking.startsAt,
      attendeeName: booking.attendeeName,
      attendeeEmail: booking.attendeeEmail,
    },
    { status: 201 }
  );
}
