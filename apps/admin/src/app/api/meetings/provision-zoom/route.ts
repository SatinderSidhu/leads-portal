import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { createZoomMeeting, isZoomConfigured } from "../../../../lib/zoom";
import { sendZoomLinkEmail } from "../../../../lib/booking-email";

const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 4;

/**
 * Provision Zoom links for confirmed bookings that don't have one yet.
 *
 * Runs every 2 minutes from node-cron (see lib/sequence-cron.ts). Auth
 * is Bearer ${CRON_SECRET}; falls back to admin-session for manual
 * triggering from the browser.
 *
 * Designed to be a no-op when Zoom isn't configured — keeps the
 * customer booking flow unaffected by integration setup.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const { getAdminSession } = await import("../../../../lib/session");
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isZoomConfigured()) {
    return NextResponse.json({ skipped: true, reason: "Zoom not configured" });
  }

  const now = new Date();
  // Pull bookings that need a link: confirmed, future, no link yet,
  // under the retry cap. We don't lock here — provisioning is
  // idempotent at the DB layer (we update only if we got a link back).
  const pending = await prisma.meetingBooking.findMany({
    where: {
      status: "CONFIRMED",
      conferencingLink: null,
      startsAt: { gt: now },
      conferencingAttempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { startsAt: "asc" },
    take: BATCH_SIZE,
    include: {
      meetingType: { select: { name: true, durationMin: true } },
      lead: { select: { projectName: true } },
    },
  });

  let provisioned = 0;
  let failed = 0;

  for (const b of pending) {
    try {
      const topic = b.lead
        ? `${b.meetingType.name} — ${b.lead.projectName}`
        : `${b.meetingType.name} with ${b.attendeeName}`;
      const result = await createZoomMeeting({
        topic,
        startsAt: b.startsAt,
        durationMin: b.meetingType.durationMin,
        timezone: b.timezone,
        agenda: b.notes,
      });

      await prisma.meetingBooking.update({
        where: { id: b.id },
        data: {
          conferencingLink: result.joinUrl,
          zoomMeetingId: result.meetingId,
          conferencingError: null,
          conferencingAttempts: b.conferencingAttempts + 1,
          conferencingNotifiedAt: new Date(),
        },
      });
      provisioned++;

      // Best-effort follow-up email. We don't await here — if it fails
      // it'll be logged and the link is still on the booking record
      // for the admin to send manually.
      sendZoomLinkEmail({
        attendeeName: b.attendeeName,
        attendeeEmail: b.attendeeEmail,
        meetingTypeName: b.meetingType.name,
        durationMin: b.meetingType.durationMin,
        startsAt: b.startsAt,
        timezone: b.timezone,
        joinUrl: result.joinUrl,
        password: result.password,
      }).catch((err) => console.error("[zoom] sendZoomLinkEmail failed:", err));
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[zoom] provisioning failed for booking ${b.id}:`, msg);
      await prisma.meetingBooking.update({
        where: { id: b.id },
        data: {
          conferencingError: msg.slice(0, 500),
          conferencingAttempts: b.conferencingAttempts + 1,
        },
      });
    }
  }

  return NextResponse.json({ claimed: pending.length, provisioned, failed });
}
