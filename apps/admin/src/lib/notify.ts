import { prisma } from "@leads-portal/database";
import { transporter, getFromAddress } from "./email";

export type NotificationEvent =
  | "new_lead_created"
  | "email_sent_to_customer"
  | "customer_response"
  | "customer_portal_visit"
  | "customer_comment"
  | "lead_status_change"
  | "lead_assigned"
  | "sow_signed"
  | "nda_signed";

// Map event names to NotificationPreference column names
const EVENT_TO_PREF_KEY: Record<NotificationEvent, string> = {
  new_lead_created: "newLeadCreated",
  email_sent_to_customer: "emailSentToCustomer",
  customer_response: "customerResponse",
  customer_portal_visit: "customerPortalVisit",
  customer_comment: "customerComment",
  lead_status_change: "leadStatusChange",
  lead_assigned: "leadAssigned",
  sow_signed: "sowSigned",
  nda_signed: "ndaSigned",
};

interface NotifyParams {
  event: NotificationEvent;
  leadId: string;
  subject: string;
  body: string;
  excludeAdminId?: string;
  // If provided, only notify these specific admin IDs (plus watchers/assigned)
  // If not provided, notify all admins for broadcast events (e.g. new_lead_created)
  broadcastToAll?: boolean;
}

/**
 * Get the preferred email for an admin (notification email or profile email)
 */
async function getAdminNotificationEmail(adminId: string, profileEmail: string): Promise<string> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { adminId },
    select: { notificationEmail: true },
  });
  return prefs?.notificationEmail || profileEmail;
}

/**
 * Check if an admin has opted in to a specific notification event.
 * Returns true if no preference record exists (default = all on).
 */
async function isOptedIn(adminId: string, event: NotificationEvent): Promise<boolean> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { adminId },
  });
  if (!prefs) return true; // Default: all notifications on
  return (prefs as Record<string, unknown>)[EVENT_TO_PREF_KEY[event]] !== false;
}

/**
 * Send a notification email respecting admin preferences.
 * - For lead-specific events: notifies watchers + assigned admin
 * - For broadcast events (broadcastToAll=true): notifies all active admins
 * - Checks each admin's notification preferences before sending
 */
export async function sendNotification(params: NotifyParams) {
  try {
    const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
    const leadUrl = `${adminUrl}/leads/${params.leadId}`;

    // Build recipient list
    const recipientMap = new Map<string, string>(); // adminId -> email

    if (params.broadcastToAll) {
      // Broadcast to all active admins
      const allAdmins = await prisma.adminUser.findMany({
        where: { active: true },
        select: { id: true, email: true },
      });
      for (const admin of allAdmins) {
        if (admin.id !== params.excludeAdminId) {
          const email = await getAdminNotificationEmail(admin.id, admin.email);
          recipientMap.set(admin.id, email);
        }
      }
    } else {
      // Lead-specific: notify watchers + assigned admin
      const lead = await prisma.lead.findUnique({
        where: { id: params.leadId },
        select: {
          assignedToId: true,
          assignedTo: { select: { id: true, email: true } },
          watchers: {
            include: {
              admin: { select: { id: true, email: true } },
            },
          },
        },
      });
      if (!lead) return;

      for (const w of lead.watchers) {
        if (w.adminId !== params.excludeAdminId) {
          const email = await getAdminNotificationEmail(w.adminId, w.admin.email);
          recipientMap.set(w.adminId, email);
        }
      }
      if (lead.assignedTo && lead.assignedTo.id !== params.excludeAdminId && !recipientMap.has(lead.assignedTo.id)) {
        const email = await getAdminNotificationEmail(lead.assignedTo.id, lead.assignedTo.email);
        recipientMap.set(lead.assignedTo.id, email);
      }
    }

    if (recipientMap.size === 0) return;

    // Filter by notification preferences
    const eligibleEmails: string[] = [];
    for (const [adminId, email] of recipientMap) {
      if (await isOptedIn(adminId, params.event)) {
        eligibleEmails.push(email);
      }
    }

    if (eligibleEmails.length === 0) return;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${params.subject}</h1>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          ${params.body}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${leadUrl}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View Lead</a>
          </div>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">
          You can manage your notification preferences in the admin portal.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: getFromAddress(),
      to: eligibleEmails[0],
      ...(eligibleEmails.length > 1 && { bcc: eligibleEmails.slice(1).join(",") }),
      subject: params.subject,
      html,
    });

    console.log(`[Notify] ${params.event}: sent to ${eligibleEmails.length} admin(s) for lead ${params.leadId}`);
  } catch (error) {
    console.error(`[Notify] ${params.event} failed:`, error);
  }
}
