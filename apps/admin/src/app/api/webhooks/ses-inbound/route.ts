import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { simpleParser } from "mailparser";
import { sendNotification } from "../../../../lib/notify";

// SNS message types
interface SnsMessage {
  Type: string;
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  SubscribeURL?: string;
  Token?: string;
}

// SES notification within SNS Message
interface SesNotification {
  notificationType: string;
  receipt: {
    recipients: string[];
    action: {
      type: string;
      bucketName?: string;
      objectKey?: string;
    };
  };
  mail: {
    messageId: string;
    source: string;
    commonHeaders: {
      from: string[];
      to: string[];
      subject: string;
      messageId: string;
    };
  };
  content?: string; // Raw email content (when using SNS action, not S3)
}

/**
 * Extract lead ID from the reply-to address
 * Format: reply+{leadId}@kitlabs.us
 */
function extractLeadId(recipients: string[]): string | null {
  for (const recipient of recipients) {
    const match = recipient.match(/reply\+([a-f0-9-]+)@/i);
    if (match) return match[1];
  }
  return null;
}

/**
 * Strip quoted reply content — keep only the new message
 */
function stripQuotedReply(text: string): string {
  // Common reply markers
  const markers = [
    /^On .+ wrote:$/m,
    /^-{2,}\s*Original Message\s*-{2,}/m,
    /^>{1,}\s/m,
    /^From:\s/m,
    /^\*From:\*\s/m,
  ];

  let cleanText = text;
  for (const marker of markers) {
    const idx = cleanText.search(marker);
    if (idx > 0) {
      cleanText = cleanText.substring(0, idx);
      break;
    }
  }

  return cleanText.trim();
}

export async function POST(req: Request) {
  let body: SnsMessage;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle SNS subscription confirmation
  if (body.Type === "SubscriptionConfirmation" && body.SubscribeURL) {
    console.log("[SES Inbound] SNS subscription confirmation, confirming...");
    try {
      await fetch(body.SubscribeURL);
      console.log("[SES Inbound] SNS subscription confirmed");
      return NextResponse.json({ status: "confirmed" });
    } catch (err) {
      console.error("[SES Inbound] Failed to confirm subscription:", err);
      return NextResponse.json({ error: "Failed to confirm" }, { status: 500 });
    }
  }

  // Handle notification
  if (body.Type !== "Notification") {
    return NextResponse.json({ status: "ignored" });
  }

  let notification: SesNotification;
  try {
    notification = JSON.parse(body.Message);
  } catch {
    console.error("[SES Inbound] Failed to parse SNS message");
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  // Only process received emails
  if (notification.notificationType !== "Received") {
    console.log(`[SES Inbound] Ignoring notification type: ${notification.notificationType}`);
    return NextResponse.json({ status: "ignored" });
  }

  const recipients = notification.receipt?.recipients || notification.mail?.commonHeaders?.to || [];
  const leadId = extractLeadId(recipients);

  if (!leadId) {
    console.log("[SES Inbound] No lead ID found in recipients:", recipients);
    return NextResponse.json({ status: "no_lead_id" });
  }

  // Verify the lead exists
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true },
  });

  if (!lead) {
    console.log(`[SES Inbound] Lead not found: ${leadId}`);
    return NextResponse.json({ status: "lead_not_found" });
  }

  // Check for duplicate by messageId
  const messageId = notification.mail?.commonHeaders?.messageId || notification.mail?.messageId;
  if (messageId) {
    const existing = await prisma.receivedEmail.findUnique({
      where: { messageId },
    });
    if (existing) {
      console.log(`[SES Inbound] Duplicate message: ${messageId}`);
      return NextResponse.json({ status: "duplicate" });
    }
  }

  let fromEmail = notification.mail?.source || "";
  let fromName: string | null = null;
  let subject = notification.mail?.commonHeaders?.subject || "(No subject)";
  let bodyText: string | null = null;
  let bodyHtml: string | null = null;

  // Parse the raw email content if available
  if (notification.content) {
    try {
      const parsed = await simpleParser(notification.content);
      fromEmail = parsed.from?.value?.[0]?.address || fromEmail;
      fromName = parsed.from?.value?.[0]?.name || null;
      subject = parsed.subject || subject;
      bodyText = parsed.text ? stripQuotedReply(parsed.text) : null;
      bodyHtml = typeof parsed.html === "string" ? parsed.html : null;
    } catch (err) {
      console.error("[SES Inbound] Failed to parse email content:", err);
    }
  } else {
    // If no raw content (S3 action), use headers
    const fromHeaders = notification.mail?.commonHeaders?.from || [];
    if (fromHeaders.length > 0) {
      const fromMatch = fromHeaders[0].match(/^(.+?)\s*<(.+?)>$/);
      if (fromMatch) {
        fromName = fromMatch[1].replace(/"/g, "").trim();
        fromEmail = fromMatch[2];
      }
    }
  }

  // Store in database
  try {
    const received = await prisma.receivedEmail.create({
      data: {
        leadId,
        messageId: messageId || null,
        fromEmail,
        fromName,
        subject,
        bodyText,
        bodyHtml,
      },
    });

    console.log(`[SES Inbound] Saved reply from ${fromEmail} for lead ${leadId} (${received.id})`);

    // Notify watchers about customer reply
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { projectName: true, customerName: true },
    });
    if (lead) {
      sendNotification({
        event: "customer_response",
        leadId,
        subject: `Customer Reply: ${lead.projectName}`,
        body: `
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            <strong>${fromName || fromEmail}</strong> replied to your email on <strong>${lead.projectName}</strong>.
          </p>
          <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Subject:</strong> ${subject || "(no subject)"}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>From:</strong> ${fromEmail}</p>
          </div>
        `,
      }).catch(() => {});
    }

    return NextResponse.json({ status: "saved", id: received.id });
  } catch (err) {
    console.error("[SES Inbound] Failed to save email:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
