import nodemailer from "nodemailer";
import { prisma } from "@leads-portal/database";
import { buildMeetingIcs } from "./ics";

/**
 * Build a display-name "From" header. Mirrors the helper in
 * apps/admin/src/lib/email.ts — duplicated rather than cross-imported
 * because the two apps don't share a lib.
 *
 * SMTP_FROM may be either a bare address ("leads@kitlabs.us") or
 * already pre-decorated ("KITLabs <leads@kitlabs.us>"). We pull the
 * address out and replace whatever display name was in front with the
 * one we want, so the customer sees a real human or branded sender
 * instead of the raw account.
 */
function getFromAddress(name?: string): string {
  const smtpFrom = process.env.SMTP_FROM || "noreply@kitlabs.us";
  if (!name) return smtpFrom;
  const m = smtpFrom.match(/<(.+)>/);
  const address = m ? m[1] : smtpFrom;
  const safeName = name.replace(/"/g, '\\"');
  return `"${safeName}" <${address}>`;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Load a system email template from DB and merge tags.
 * Falls back to provided defaults if template not found.
 */
export async function getSystemEmailContent(
  systemKey: string,
  mergeData: Record<string, string>,
  fallbackSubject: string,
  fallbackHtml: string
): Promise<{ subject: string; html: string }> {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { systemKey },
      select: { subject: true, body: true },
    });
    if (template) {
      const merge = (text: string) => {
        let result = text;
        for (const [key, value] of Object.entries(mergeData)) {
          result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
        }
        return result;
      };
      return { subject: merge(template.subject), html: merge(template.body) };
    }
  } catch (e) {
    console.error(`[Email] Failed to load system template "${systemKey}":`, e);
  }
  return { subject: fallbackSubject, html: fallbackHtml };
}

/**
 * Generate the unsubscribe footer HTML for customer-facing emails.
 */
export function getUnsubscribeFooter(customerEmail: string, leadId: string): string {
  const customerPortalUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.CUSTOMER_PORTAL_URL || "https://leadsportal.kitlabs.us";
  const unsubUrl = `${customerPortalUrl}/unsubscribe?email=${encodeURIComponent(customerEmail)}&leadId=${encodeURIComponent(leadId)}`;
  return `<div style="text-align: center; padding-top: 20px; margin-top: 20px; border-top: 1px solid #eee;"><p style="color: #999; font-size: 11px; margin: 0;">If you no longer wish to receive these emails, you can <a href="${unsubUrl}" style="color: #999; text-decoration: underline;">unsubscribe here</a>.</p></div>`;
}

interface NdaSignedParams {
  leadId: string;
  customerName: string;
  customerEmail: string;
  projectName: string;
  signerName: string;
  signedAt: Date;
  signerIp: string;
  portalUrl: string;
}

export async function sendNdaSignedEmail(params: NdaSignedParams) {
  const {
    leadId,
    customerName,
    customerEmail,
    projectName,
    signerName,
    signedAt,
    signerIp,
    portalUrl,
  } = params;

  const formattedDate = signedAt.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const fromEmail = process.env.SMTP_FROM || "noreply@leadsportal.com";

  console.log(`[Email] Sending NDA signed confirmations for "${projectName}"...`);
  const start = Date.now();

  // Email to customer (use system template)
  const fallbackNdaHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">NDA Signed Successfully</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">${projectName}</p>
      </div>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi ${customerName},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">This confirms that the Non-Disclosure Agreement for <strong>${projectName}</strong> has been successfully signed.</p>
        <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Signed By:</strong> ${signerName}</p>
          <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${portalUrl}" style="display: inline-block; background: #333; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View Your Project</a>
        </div>
      </div>
      <p style="color: #999; font-size: 13px; text-align: center;">If you have any questions, simply reply to this email.</p>
    </div>`;
  const { subject: ndaSubj, html: ndaCustHtml } = await getSystemEmailContent("system_nda_signed", {
    customerName, projectName, signerName, signedDate: formattedDate, portalUrl,
  }, `NDA Signed Successfully — ${projectName}`, fallbackNdaHtml);
  await transporter.sendMail({
    from: fromEmail,
    to: customerEmail,
    subject: ndaSubj,
    html: ndaCustHtml + getUnsubscribeFooter(customerEmail, leadId),
  });

  // Email to admin
  await transporter.sendMail({
    from: fromEmail,
    to: fromEmail,
    subject: `NDA Signed by ${customerName} — ${projectName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">NDA Signed</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">${projectName}</p>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            The NDA for <strong>${projectName}</strong> has been signed by the customer.
          </p>

          <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Customer:</strong> ${customerName}</p>
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Email:</strong> ${customerEmail}</p>
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Signed By:</strong> ${signerName}</p>
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>IP Address:</strong> ${signerIp}</p>
          </div>
        </div>
      </div>
    `,
  });

  console.log(`[Email] NDA signed emails sent in ${Date.now() - start}ms`);
}

interface LeadInfo {
  id: string;
  customerName: string;
  customerEmail: string;
  projectName: string;
}

export async function sendSowCommentNotification(
  lead: LeadInfo,
  version: number,
  commenterName: string,
  commentContent: string
) {
  const fromEmail = process.env.SMTP_FROM || "noreply@leadsportal.com";
  const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";

  console.log(`[Email] Sending SOW comment notification for "${lead.projectName}"...`);

  // Notify admin
  await transporter.sendMail({
    from: fromEmail,
    to: fromEmail,
    subject: `New SOW Comment from ${commenterName} — ${lead.projectName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New SOW Comment</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">${lead.projectName} — v${version}</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            <strong>${commenterName}</strong> left a comment on the Scope of Work (v${version}):
          </p>
          <div style="background: white; border-left: 4px solid #01358d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${commentContent}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminUrl}/leads/${lead.id}" style="display: inline-block; background: #01358d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View in Admin</a>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendSowSignedNotification(
  lead: LeadInfo,
  version: number,
  signerName: string,
  signedAt: Date,
  signerIp: string
) {
  const fromEmail = process.env.SMTP_FROM || "noreply@leadsportal.com";
  const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
  const portalUrl = `${process.env.CUSTOMER_PORTAL_URL || "http://localhost:3001"}?id=${lead.id}&tab=sow`;

  const formattedDate = signedAt.toLocaleString("en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  console.log(`[Email] Sending SOW signed notifications for "${lead.projectName}"...`);
  const start = Date.now();

  // Email to customer (use system template)
  const fallbackSowHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">SOW Approved</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">${lead.projectName}</p>
      </div>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi ${lead.customerName},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">This confirms that the Scope of Work (v${version}) for <strong>${lead.projectName}</strong> has been approved and signed.</p>
        <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Signed By:</strong> ${signerName}</p>
          <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${portalUrl}" style="display: inline-block; background: #333; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View Your Project</a>
        </div>
      </div>
    </div>`;
  const { subject: sowSubj, html: sowCustHtml } = await getSystemEmailContent("system_sow_signed", {
    customerName: lead.customerName, projectName: lead.projectName, signerName,
    signedDate: formattedDate, sowVersion: String(version), portalUrl,
  }, `Scope of Work Approved — ${lead.projectName}`, fallbackSowHtml);
  await transporter.sendMail({
    from: fromEmail,
    to: lead.customerEmail,
    subject: sowSubj,
    html: sowCustHtml + getUnsubscribeFooter(lead.customerEmail, lead.id),
  });

  // Email to admin
  await transporter.sendMail({
    from: fromEmail,
    to: fromEmail,
    subject: `SOW Signed by ${lead.customerName} — ${lead.projectName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">SOW Signed</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">${lead.projectName}</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">The Scope of Work (v${version}) for <strong>${lead.projectName}</strong> has been signed by the customer.</p>
          <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Customer:</strong> ${lead.customerName}</p>
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Email:</strong> ${lead.customerEmail}</p>
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Signed By:</strong> ${signerName}</p>
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>IP:</strong> ${signerIp}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminUrl}/leads/${lead.id}" style="display: inline-block; background: #01358d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View in Admin</a>
          </div>
        </div>
      </div>
    `,
  });

  console.log(`[Email] SOW signed emails sent in ${Date.now() - start}ms`);
}

export async function notifyLeadWatchers(
  leadId: string,
  projectName: string,
  context: { commenterName: string; commentContent: string; section: string }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        watchers: {
          include: { admin: { select: { id: true, email: true } } },
        },
        assignedTo: { select: { id: true, email: true } },
      },
    });
    if (!lead) return;

    // Build admin list and check preferences
    const adminIds: string[] = [];
    const adminEmails = new Map<string, string>();
    for (const w of lead.watchers) {
      adminIds.push(w.adminId);
      adminEmails.set(w.adminId, w.admin.email);
    }
    if (lead.assignedTo && !adminEmails.has(lead.assignedTo.id)) {
      adminIds.push(lead.assignedTo.id);
      adminEmails.set(lead.assignedTo.id, lead.assignedTo.email);
    }
    if (adminIds.length === 0) return;

    // Check notification preferences
    const prefs = await prisma.notificationPreference.findMany({
      where: { adminId: { in: adminIds } },
    });
    const prefsMap = new Map(prefs.map((p) => [p.adminId, p]));

    const emailList: string[] = [];
    for (const [adminId, email] of adminEmails) {
      const pref = prefsMap.get(adminId);
      if (!pref || pref.customerComment !== false) {
        emailList.push(pref?.notificationEmail || email);
      }
    }
    if (emailList.length === 0) return;

    const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
    const leadUrl = `${adminUrl}/leads/${leadId}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@leadsportal.com",
      to: emailList[0],
      ...(emailList.length > 1 && { bcc: emailList.slice(1).join(",") }),
      subject: `New Comment from ${context.commenterName} — ${projectName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 20px;">New Customer Comment</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">${projectName} — ${context.section}</p>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
              <strong>${context.commenterName}</strong> left a comment on ${context.section}:
            </p>
            <div style="background: white; border-left: 4px solid #f9556d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${context.commentContent.slice(0, 500)}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${leadUrl}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View in Admin</a>
            </div>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">You're receiving this because you're watching this lead.</p>
        </div>
      `,
    });

    console.log(`[Watcher] Notified ${emailList.length} watcher(s) for customer comment on ${leadId}`);
  } catch (error) {
    console.error("[Watcher] Failed to notify watchers:", error);
  }
}

export async function notifyDocumentUploaded(
  leadId: string,
  projectName: string,
  uploaderName: string,
  fileName: string
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        watchers: { include: { admin: { select: { id: true, email: true } } } },
        assignedTo: { select: { id: true, email: true } },
      },
    });
    if (!lead) return;

    const adminIds: string[] = [];
    const adminEmails = new Map<string, string>();
    for (const w of lead.watchers) {
      adminIds.push(w.adminId);
      adminEmails.set(w.adminId, w.admin.email);
    }
    if (lead.assignedTo && !adminEmails.has(lead.assignedTo.id)) {
      adminIds.push(lead.assignedTo.id);
      adminEmails.set(lead.assignedTo.id, lead.assignedTo.email);
    }
    if (adminIds.length === 0) return;

    const prefs = await prisma.notificationPreference.findMany({
      where: { adminId: { in: adminIds } },
    });
    const prefsMap = new Map(prefs.map((p) => [p.adminId, p]));

    const emailList: string[] = [];
    for (const [adminId, email] of adminEmails) {
      const pref = prefsMap.get(adminId);
      if (!pref || pref.customerComment !== false) {
        emailList.push(pref?.notificationEmail || email);
      }
    }
    if (emailList.length === 0) return;

    const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
    const leadUrl = `${adminUrl}/leads/${leadId}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@leadsportal.com",
      to: emailList[0],
      ...(emailList.length > 1 && { bcc: emailList.slice(1).join(",") }),
      subject: `Document uploaded: ${fileName} — ${projectName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 20px;">New Document Uploaded</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">${projectName}</p>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
              <strong>${uploaderName}</strong> uploaded a document to their project portal.
            </p>
            <div style="background: white; border-left: 4px solid #f9556d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">📎 <strong>${fileName}</strong></p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${leadUrl}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View Lead</a>
            </div>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">You're receiving this because you're watching this lead.</p>
        </div>
      `,
    });

    console.log(`[Document] Notified ${emailList.length} admin(s) about upload on ${leadId}`);
  } catch (error) {
    console.error("[Document] Failed to notify watchers:", error);
  }
}

export async function notifyQuestionnaireSubmitted(
  leadId: string,
  projectName: string,
  customerName: string,
  questionCount: number
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        watchers: { include: { admin: { select: { id: true, email: true } } } },
        assignedTo: { select: { id: true, email: true } },
      },
    });
    if (!lead) return;

    const adminIds: string[] = [];
    const adminEmails = new Map<string, string>();
    for (const w of lead.watchers) {
      adminIds.push(w.adminId);
      adminEmails.set(w.adminId, w.admin.email);
    }
    if (lead.assignedTo && !adminEmails.has(lead.assignedTo.id)) {
      adminIds.push(lead.assignedTo.id);
      adminEmails.set(lead.assignedTo.id, lead.assignedTo.email);
    }
    if (adminIds.length === 0) return;

    const prefs = await prisma.notificationPreference.findMany({
      where: { adminId: { in: adminIds } },
    });
    const prefsMap = new Map(prefs.map((p) => [p.adminId, p]));

    const emailList: string[] = [];
    for (const [adminId, email] of adminEmails) {
      const pref = prefsMap.get(adminId);
      if (!pref || pref.customerComment !== false) {
        emailList.push(pref?.notificationEmail || email);
      }
    }
    if (emailList.length === 0) return;

    const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
    const leadUrl = `${adminUrl}/leads/${leadId}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@leadsportal.com",
      to: emailList[0],
      ...(emailList.length > 1 && { bcc: emailList.slice(1).join(",") }),
      subject: `Questionnaire submitted by ${customerName} — ${projectName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 20px;">Questionnaire Submitted</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">${projectName}</p>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
              <strong>${customerName}</strong> answered the ${questionCount}-question survey for this project.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${leadUrl}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">Review Answers</a>
            </div>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">You're receiving this because you're watching this lead.</p>
        </div>
      `,
    });

    console.log(`[Questionnaire] Notified ${emailList.length} admin(s) about submission on ${leadId}`);
  } catch (err) {
    console.error("[Questionnaire] Failed to notify watchers:", err);
  }
}

export async function sendAppFlowCommentNotification(
  lead: LeadInfo,
  flowName: string,
  commenterName: string,
  commentContent: string
) {
  const fromEmail = process.env.SMTP_FROM || "noreply@leadsportal.com";
  const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";

  console.log(`[Email] Sending app flow comment notification for "${lead.projectName}"...`);

  await transporter.sendMail({
    from: fromEmail,
    to: fromEmail,
    subject: `New App Flow Comment from ${commenterName} — ${lead.projectName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New App Flow Comment</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">${lead.projectName} — ${flowName}</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            <strong>${commenterName}</strong> left a comment on the app flow "${flowName}":
          </p>
          <div style="background: white; border-left: 4px solid #01358d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${commentContent}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminUrl}/leads/${lead.id}" style="display: inline-block; background: #01358d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View in Admin</a>
          </div>
        </div>
      </div>
    `,
  });
}

/**
 * Confirmation email back to the attendee after a meeting booking.
 * Non-blocking — callers should swallow rejections.
 */
export async function sendMeetingConfirmation(opts: {
  bookingId: string;
  attendeeName: string;
  attendeeEmail: string;
  meetingTypeName: string;
  durationMin: number;
  startsAt: Date;
  endsAt?: Date;
  timezone: string | null;
  notes?: string | null;
  conferencingLink?: string | null;
  /** Display name shown in the From header. When the booking is tied
   *  to a lead, this is the assigned admin's name; otherwise it's a
   *  branded fallback like "KITLabs Meetings". */
  senderName?: string;
}) {
  const tz = opts.timezone || "America/New_York";
  const when = opts.startsAt.toLocaleString("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  // Build the .ics so Outlook / Google Calendar / Apple Calendar can
  // add the meeting in one click (or RSVP if the client supports it).
  const endsAt = opts.endsAt || new Date(opts.startsAt.getTime() + opts.durationMin * 60 * 1000);
  const organizerEmail = process.env.SMTP_FROM?.match(/<(.+)>/)?.[1] || process.env.SMTP_FROM || "noreply@kitlabs.us";
  const ics = buildMeetingIcs({
    bookingId: opts.bookingId,
    startsAt: opts.startsAt,
    endsAt,
    meetingTypeName: opts.meetingTypeName,
    attendeeName: opts.attendeeName,
    attendeeEmail: opts.attendeeEmail,
    organizerEmail,
    conferencingLink: opts.conferencingLink ?? null,
    notes: opts.notes ?? null,
    // Initial confirmation. If Zoom link arrives later, the follow-up
    // email re-sends with SEQUENCE:1 — RFC-5546 clients update the same
    // event instead of duplicating.
    sequence: 0,
  });

  await transporter.sendMail({
    from: getFromAddress(opts.senderName || "KITLabs Meetings"),
    to: opts.attendeeEmail,
    subject: `Meeting confirmed — ${opts.meetingTypeName} on ${opts.startsAt.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" })}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 22px;">You're booked!</h1>
          <p style="color: rgba(255,255,255,0.92); margin: 8px 0 0; font-size: 15px;">${opts.meetingTypeName} · ${opts.durationMin} minutes</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
          <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">Hi ${opts.attendeeName.split(/\s+/)[0]},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            Your meeting with KITLabs is confirmed. We've attached a calendar invite — open it to add this to Outlook, Google Calendar, or Apple Calendar. ${opts.conferencingLink ? "The Zoom link is included." : "We'll send the conferencing link separately."}
          </p>
          <div style="background: white; border-left: 4px solid #f9556d; padding: 16px; border-radius: 0 8px 8px 0; margin: 0 0 16px;">
            <p style="margin: 0 0 4px; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">When</p>
            <p style="margin: 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">${when}</p>
          </div>
          <p style="color: #666; font-size: 13px; line-height: 1.5; margin: 16px 0 0;">
            Need to reschedule? Reply to this email and we'll sort it out.
          </p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">KITLabs Inc · kitlabs.us</p>
      </div>
    `,
    icalEvent: {
      filename: "meeting.ics",
      method: "REQUEST",
      content: ics,
    },
  });
}

/**
 * Notify the assigned admin + watchers when a meeting is booked.
 * Falls back to a broadcast to all active admins if the booking isn't
 * tied to a specific lead (cold booking from the public /book URL).
 */
export async function notifyMeetingBooked(opts: {
  bookingId: string;
  leadId: string | null;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  meetingTypeName: string;
  durationMin: number;
  startsAt: Date;
  notes: string | null;
}) {
  const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
  const adminEmails = new Map<string, string>();

  if (opts.leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: opts.leadId },
      select: {
        watchers: { include: { admin: { select: { id: true, email: true } } } },
        assignedTo: { select: { id: true, email: true } },
      },
    });
    if (lead) {
      for (const w of lead.watchers) adminEmails.set(w.adminId, w.admin.email);
      if (lead.assignedTo) adminEmails.set(lead.assignedTo.id, lead.assignedTo.email);
    }
  }

  // Cold booking (no lead) or a lead with no watchers/assignee — broadcast
  // to all active admins so the meeting doesn't go silently into the
  // database.
  if (adminEmails.size === 0) {
    const admins = await prisma.adminUser.findMany({
      where: { active: true },
      select: { id: true, email: true },
    });
    for (const a of admins) adminEmails.set(a.id, a.email);
    if (adminEmails.size === 0) return;
  }

  // Honour the customerComment preference — same toggle that covers
  // requirement notifications and customer comments.
  const prefs = await prisma.notificationPreference.findMany({
    where: { adminId: { in: Array.from(adminEmails.keys()) } },
  });
  const prefsMap = new Map(prefs.map((p) => [p.adminId, p]));
  const emailList: string[] = [];
  for (const [adminId, fallback] of adminEmails) {
    const pref = prefsMap.get(adminId);
    if (pref && pref.customerComment === false) continue;
    emailList.push(pref?.notificationEmail || fallback);
  }
  if (emailList.length === 0) return;

  const tz = "America/New_York";
  const when = opts.startsAt.toLocaleString("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const detailLink = `${adminUrl}/meetings`;

  // Attach the same .ics so admins can drop the meeting into their own
  // calendar. UID is keyed off bookingId; the Zoom-link follow-up will
  // re-send a SEQUENCE:1 update with the actual link.
  const endsAt = new Date(opts.startsAt.getTime() + opts.durationMin * 60 * 1000);
  const organizerEmail = process.env.SMTP_FROM?.match(/<(.+)>/)?.[1] || process.env.SMTP_FROM || "noreply@kitlabs.us";
  const ics = buildMeetingIcs({
    bookingId: opts.bookingId,
    startsAt: opts.startsAt,
    endsAt,
    meetingTypeName: opts.meetingTypeName,
    attendeeName: opts.attendeeName,
    attendeeEmail: opts.attendeeEmail,
    organizerEmail,
    conferencingLink: null,
    notes: opts.notes,
    sequence: 0,
  });

  await transporter.sendMail({
    from: getFromAddress("KITLabs Meetings"),
    to: emailList[0],
    ...(emailList.length > 1 && { bcc: emailList.slice(1).join(",") }),
    subject: `New meeting booked — ${opts.attendeeName} (${opts.meetingTypeName})`,
    icalEvent: {
      filename: "meeting.ics",
      method: "REQUEST",
      content: ics,
    },
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">New Meeting Booked</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">${opts.meetingTypeName} · ${opts.durationMin} min</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
          <p style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 0 0 4px;">${opts.attendeeName}</p>
          <p style="color: #666; font-size: 14px; margin: 0 0 16px;">${opts.attendeeEmail}${opts.attendeePhone ? ` · ${opts.attendeePhone}` : ""}</p>
          <div style="background: white; border-left: 4px solid #f9556d; padding: 16px; border-radius: 0 8px 8px 0; margin: 0 0 16px;">
            <p style="margin: 0 0 4px; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">When</p>
            <p style="margin: 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">${when}</p>
          </div>
          ${opts.notes ? `<div style="background: white; border-left: 4px solid #01358d; padding: 16px; border-radius: 0 8px 8px 0; margin: 0 0 16px;"><p style="margin: 0 0 4px; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Notes</p><p style="margin: 0; color: #333; font-size: 14px; white-space: pre-wrap;">${opts.notes}</p></div>` : ""}
          <div style="text-align: center; margin: 24px 0 0;">
            <a href="${detailLink}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">Open Meetings</a>
          </div>
        </div>
      </div>
    `,
  });
}

/**
 * Notify watchers + the assigned admin when a customer adds a requirement.
 * Same pref-gating shape as notifyLeadWatchers — opting out of customer
 * comments also opts out of requirement notifications, since the customer
 * adding a requirement is conceptually the same class of input event.
 *
 * Non-blocking: callers should swallow rejections.
 */
export async function notifyRequirementAdded(
  leadId: string,
  projectName: string,
  context: {
    customerName: string;
    requirementType: string; // EPIC | FEATURE | USER_STORY
    title: string;
    priority: string; // LOW | MEDIUM | HIGH | CRITICAL
    description: string | null;
  }
) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      watchers: { include: { admin: { select: { id: true, email: true } } } },
      assignedTo: { select: { id: true, email: true } },
    },
  });
  if (!lead) return;

  // Build recipient list — watchers + assigned, de-duped by adminId.
  const adminEmails = new Map<string, string>();
  for (const w of lead.watchers) adminEmails.set(w.adminId, w.admin.email);
  if (lead.assignedTo) adminEmails.set(lead.assignedTo.id, lead.assignedTo.email);
  if (adminEmails.size === 0) return;

  // Respect notification preferences. customerComment is the closest
  // existing toggle; admins who opt out of comments also opt out here.
  const prefs = await prisma.notificationPreference.findMany({
    where: { adminId: { in: Array.from(adminEmails.keys()) } },
  });
  const prefsMap = new Map(prefs.map((p) => [p.adminId, p]));

  const emailList: string[] = [];
  for (const [adminId, fallbackEmail] of adminEmails) {
    const pref = prefsMap.get(adminId);
    if (pref && pref.customerComment === false) continue;
    emailList.push(pref?.notificationEmail || fallbackEmail);
  }
  if (emailList.length === 0) return;

  const typeLabel = context.requirementType.toLowerCase().replace("_", " ");
  const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
  const leadUrl = `${adminUrl}/leads/${leadId}`;
  const priorityColors: Record<string, string> = {
    CRITICAL: "#dc2626",
    HIGH: "#ea580c",
    MEDIUM: "#0891b2",
    LOW: "#65a30d",
  };
  const priColor = priorityColors[context.priority] || "#01358d";

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@leadsportal.com",
    to: emailList[0],
    ...(emailList.length > 1 && { bcc: emailList.slice(1).join(",") }),
    subject: `New ${typeLabel} from ${context.customerName} — ${projectName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">New Customer Requirement</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">${projectName}</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
          <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            <strong>${context.customerName}</strong> added a new ${typeLabel} on the customer portal:
          </p>
          <div style="background: white; border-left: 4px solid ${priColor}; padding: 16px; margin: 0 0 16px; border-radius: 0 8px 8px 0;">
            <div style="margin-bottom: 8px;">
              <span style="display: inline-block; background: ${priColor}; color: white; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 6px;">${context.priority}</span>
              <span style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">${typeLabel}</span>
            </div>
            <p style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 0 0 8px; line-height: 1.4;">${context.title}</p>
            ${context.description ? `<div style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 8px 0 0;">${context.description}</div>` : ""}
          </div>
          <div style="text-align: center; margin: 24px 0 0;">
            <a href="${leadUrl}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View in Admin</a>
          </div>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">You're receiving this because you're watching this lead or it's assigned to you.</p>
      </div>
    `,
  });
}
