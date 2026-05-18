/**
 * iCalendar (.ics) generator for meeting bookings.
 *
 * Used to attach calendar invites to confirmation + Zoom-link emails so
 * Outlook / Google Calendar / Apple Calendar pick them up natively. The
 * UID is deterministic (booking id) so the second send (Zoom link
 * email, SEQUENCE:1) is treated as an UPDATE to the same event in any
 * RFC-5546-compliant client — no duplicate calendar entries.
 *
 * Why we ship a tiny hand-rolled generator instead of pulling a
 * library: the spec we need is ~10 fields and depending on an external
 * package for a constant-shape string is overkill.
 */

export interface IcsMeetingArgs {
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
  meetingTypeName: string;
  attendeeName: string;
  attendeeEmail: string;
  organizerEmail: string;
  conferencingLink: string | null;
  notes: string | null;
  /** 0 for the initial confirmation, increment on update (Zoom link arrived, time changed, etc.). */
  sequence: number;
  /** CANCELLED on cancel emails so the calendar removes the event. Defaults to CONFIRMED. */
  status?: "CONFIRMED" | "CANCELLED";
}

const PRODID = "-//KITLabs//Leads Portal//EN";

export function buildMeetingIcs(args: IcsMeetingArgs): string {
  const dtstamp = formatIcsDate(new Date());
  const dtstart = formatIcsDate(args.startsAt);
  const dtend = formatIcsDate(args.endsAt);
  const uid = `meeting-${args.bookingId}@kitlabs.us`;
  const status = args.status || "CONFIRMED";

  const summary = `${args.meetingTypeName} with KITLabs`;

  const descLines: string[] = [];
  if (args.conferencingLink) {
    descLines.push(`Join Zoom: ${args.conferencingLink}`);
  } else {
    descLines.push("Conferencing link will be sent in a follow-up email shortly.");
  }
  if (args.notes) {
    descLines.push("", "Notes from the booking:", args.notes);
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "METHOD:REQUEST",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(descLines.join("\n"))}`,
    `LOCATION:${icsEscape(args.conferencingLink || "Zoom (link to follow)")}`,
    `ORGANIZER;CN=KITLabs:mailto:${args.organizerEmail}`,
    `ATTENDEE;CN=${icsEscape(args.attendeeName)};RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${args.attendeeEmail}`,
    `SEQUENCE:${args.sequence}`,
    `STATUS:${status}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // RFC 5545 requires CRLF line endings.
  return lines.join("\r\n");
}

function formatIcsDate(d: Date): string {
  // YYYYMMDDTHHMMSSZ in UTC.
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function icsEscape(s: string): string {
  // Per RFC 5545: backslash, semicolon, comma must be escaped; newlines
  // become literal \n. Don't escape \n we put in the input — replace it
  // with the literal two-char sequence.
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}
