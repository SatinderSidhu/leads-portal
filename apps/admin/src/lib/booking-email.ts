/**
 * Booking-related emails sent from the admin app (where the Zoom-
 * provisioning cron runs). The customer-portal app has its own copies
 * of confirmation + admin-notify; this file is just for the follow-up
 * "your Zoom link is ready" message.
 */
import nodemailer from "nodemailer";
import { buildMeetingIcs } from "./ics";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface ZoomLinkEmailArgs {
  bookingId: string;
  attendeeName: string;
  attendeeEmail: string;
  meetingTypeName: string;
  durationMin: number;
  startsAt: Date;
  timezone: string | null;
  joinUrl: string;
  password: string | null;
  notes?: string | null;
}

export async function sendZoomLinkEmail(args: ZoomLinkEmailArgs) {
  const tz = args.timezone || "America/New_York";
  const when = args.startsAt.toLocaleString("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  // Re-issue the .ics with SEQUENCE:1 and the Zoom link populated.
  // RFC-5546-compliant clients (Outlook, Google Calendar, Apple) will
  // update the existing event in place rather than create a duplicate.
  const endsAt = new Date(args.startsAt.getTime() + args.durationMin * 60 * 1000);
  const organizerEmail = process.env.SMTP_FROM?.match(/<(.+)>/)?.[1] || process.env.SMTP_FROM || "noreply@kitlabs.us";
  const ics = buildMeetingIcs({
    bookingId: args.bookingId,
    startsAt: args.startsAt,
    endsAt,
    meetingTypeName: args.meetingTypeName,
    attendeeName: args.attendeeName,
    attendeeEmail: args.attendeeEmail,
    organizerEmail,
    conferencingLink: args.joinUrl,
    notes: args.notes ?? null,
    sequence: 1,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@leadsportal.com",
    to: args.attendeeEmail,
    subject: `Zoom link for your KITLabs meeting on ${args.startsAt.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" })}`,
    icalEvent: {
      filename: "meeting.ics",
      method: "REQUEST",
      content: ics,
    },
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Your Zoom link is ready</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">${args.meetingTypeName} · ${args.durationMin} min</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
          <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            Hi ${args.attendeeName.split(/\s+/)[0]}, here's the Zoom link for our meeting:
          </p>
          <div style="background: white; border-left: 4px solid #f9556d; padding: 16px; border-radius: 0 8px 8px 0; margin: 0 0 16px;">
            <p style="margin: 0 0 4px; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">When</p>
            <p style="margin: 0 0 12px; color: #1a1a1a; font-size: 16px; font-weight: 600;">${when}</p>
            <p style="margin: 0 0 4px; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Zoom link</p>
            <p style="margin: 0; word-break: break-all;">
              <a href="${args.joinUrl}" style="color: #01358d; font-size: 15px; text-decoration: underline;">${args.joinUrl}</a>
            </p>
            ${args.password ? `<p style="margin: 12px 0 0; color: #666; font-size: 13px;">Password: <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${args.password}</code></p>` : ""}
          </div>
          <div style="text-align: center; margin: 24px 0 0;">
            <a href="${args.joinUrl}" style="display: inline-block; background: #01358d; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">Join Zoom Meeting</a>
          </div>
          <p style="color: #666; font-size: 13px; line-height: 1.5; margin: 24px 0 0; text-align: center;">
            Need to reschedule? Reply to this email and we'll sort it out.
          </p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">KITLabs Inc · kitlabs.us</p>
      </div>
    `,
  });
}
