import { prisma } from "@leads-portal/database";

// Hardcoded business hours for v1. KITLabs is NYC-based; we expose slots
// to customers in their local browser TZ but generate them against this
// canonical office-hours window. Externalize to a settings table when
// admins need per-day overrides.
export const BUSINESS_TZ = "America/New_York";
const BUSINESS_HOURS = { startHour: 9, endHour: 17 }; // 9am - 5pm
const BOOKING_HORIZON_DAYS = 14;
// Min lead time for new bookings — customers can't grab a slot 5 min
// from now and ambush the team.
const MIN_LEAD_MINUTES = 60;

/**
 * Given a meeting-type duration and an ISO date string, return the list
 * of available slot starts (as ISO UTC strings).
 *
 * Slots are emitted at duration-aligned intervals between business
 * hours. Existing CONFIRMED bookings of any duration that overlap a
 * candidate slot exclude it.
 */
export async function getAvailableSlots(
  durationMin: number,
  dateStr: string // "YYYY-MM-DD" as the customer's intent (interpreted in BUSINESS_TZ)
): Promise<string[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];

  const [y, m, d] = dateStr.split("-").map(Number);

  // Build the day's business-hour window in BUSINESS_TZ. JS Date doesn't
  // do timezones natively, so we compute UTC offsets via Intl.
  const dayStart = zonedTimeToUtc(y, m, d, BUSINESS_HOURS.startHour, 0);
  const dayEnd = zonedTimeToUtc(y, m, d, BUSINESS_HOURS.endHour, 0);

  // Skip weekends (Sat=6, Sun=0) in the business timezone.
  const weekday = new Date(dayStart).toLocaleString("en-US", {
    timeZone: BUSINESS_TZ,
    weekday: "short",
  });
  if (weekday === "Sat" || weekday === "Sun") return [];

  // Enforce the booking horizon and minimum lead time.
  const now = Date.now();
  const horizon = now + BOOKING_HORIZON_DAYS * 24 * 60 * 60 * 1000;
  if (dayStart.getTime() > horizon) return [];

  // Pull every booking that overlaps the window. Cancellations don't
  // hold a slot.
  const existing = await prisma.meetingBooking.findMany({
    where: {
      status: { in: ["CONFIRMED", "COMPLETED"] },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
    },
    select: { startsAt: true, endsAt: true },
  });

  const stepMs = durationMin * 60 * 1000;
  const slots: string[] = [];
  for (let t = dayStart.getTime(); t + stepMs <= dayEnd.getTime(); t += stepMs) {
    const slotStart = t;
    const slotEnd = t + stepMs;
    if (slotStart < now + MIN_LEAD_MINUTES * 60 * 1000) continue;
    const overlaps = existing.some(
      (b) =>
        b.startsAt.getTime() < slotEnd && b.endsAt.getTime() > slotStart
    );
    if (!overlaps) slots.push(new Date(slotStart).toISOString());
  }
  return slots;
}

/**
 * Convert (year, month, day, hour, minute) in BUSINESS_TZ to a UTC Date.
 * Done by formatting back the assumed UTC date through the target tz and
 * adjusting for the offset diff — good enough for fixed business hours
 * where the offset is stable across a single day.
 */
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  // Initial guess: treat the wall-clock as if it were UTC.
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  // Read what BUSINESS_TZ says that UTC instant is.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(guess);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  // 24h format can return "24" for midnight in some locales; normalize.
  const renderedHour = get("hour") % 24;
  const tzWallClock = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    renderedHour,
    get("minute")
  );
  const offset = tzWallClock - guess.getTime();
  return new Date(guess.getTime() - offset);
}

export interface AvailableDayOption {
  date: string; // YYYY-MM-DD
  weekday: string; // "Mon"
  dayMonth: string; // "May 19"
}

/**
 * Next BOOKING_HORIZON_DAYS weekdays, formatted for the date picker.
 * Computed in BUSINESS_TZ so weekends line up correctly even if the
 * server runs in UTC.
 */
export function listAvailableDays(): AvailableDayOption[] {
  const out: AvailableDayOption[] = [];
  const cursor = new Date();
  for (let i = 0; out.length < BOOKING_HORIZON_DAYS && i < BOOKING_HORIZON_DAYS * 2; i++) {
    const d = new Date(cursor);
    d.setUTCDate(d.getUTCDate() + i);
    const weekday = d.toLocaleString("en-US", { timeZone: BUSINESS_TZ, weekday: "short" });
    if (weekday === "Sat" || weekday === "Sun") continue;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: BUSINESS_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const yyyy = parts.find((p) => p.type === "year")?.value;
    const mm = parts.find((p) => p.type === "month")?.value;
    const dd = parts.find((p) => p.type === "day")?.value;
    out.push({
      date: `${yyyy}-${mm}-${dd}`,
      weekday,
      dayMonth: d.toLocaleString("en-US", {
        timeZone: BUSINESS_TZ,
        month: "short",
        day: "numeric",
      }),
    });
  }
  return out;
}
