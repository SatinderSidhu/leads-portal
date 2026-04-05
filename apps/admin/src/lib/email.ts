import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface Lead {
  id: string;
  customerName: string;
  customerEmail: string;
  projectName: string;
}

/**
 * Generate the unsubscribe footer HTML for customer-facing emails.
 */
export function getUnsubscribeFooter(customerEmail: string, leadId: string): string {
  const customerPortalUrl = process.env.CUSTOMER_PORTAL_URL || "https://leadsportal.kitlabs.us";
  const unsubUrl = `${customerPortalUrl}/unsubscribe?email=${encodeURIComponent(customerEmail)}&leadId=${encodeURIComponent(leadId)}`;
  return `<div style="text-align: center; padding-top: 20px; margin-top: 20px; border-top: 1px solid #eee;"><p style="color: #999; font-size: 11px; margin: 0;">If you no longer wish to receive these emails, you can <a href="${unsubUrl}" style="color: #999; text-decoration: underline;">unsubscribe here</a>.</p></div>`;
}

/**
 * Build the "From" header using the admin's name + the SMTP sender address.
 * Gmail SMTP forces the authenticated account as sender, but the display name
 * is shown to the recipient — e.g. "Satinder Sidhu <leads@kitlabs.us>".
 */
export function getFromAddress(adminName?: string): string {
  const smtpFrom = process.env.SMTP_FROM || "noreply@leadsportal.com";
  if (adminName) {
    // RFC 5322: display name with special chars gets quoted
    const safeName = adminName.replace(/"/g, '\\"');
    return `"${safeName}" <${smtpFrom}>`;
  }
  return smtpFrom;
}

/**
 * Get reply-to address. Uses the lead-specific reply address for inbound
 * email routing (SES extracts lead ID from reply+{leadId}@domain), but
 * wraps it with the admin's display name so customers see a real person.
 * e.g. "Satinder Sidhu" <reply+abc123@reply.kitlabs.us>
 */
export function getReplyToAddress(leadId: string, adminName?: string): string {
  const replyDomain = process.env.REPLY_TO_DOMAIN || "reply.kitlabs.us";
  const replyAddr = `reply+${leadId}@${replyDomain}`;
  if (adminName) {
    const safeName = adminName.replace(/"/g, '\\"');
    return `"${safeName}" <${replyAddr}>`;
  }
  return replyAddr;
}

interface AdminInfo {
  name: string;
}

export async function sendWelcomeEmail(lead: Lead, admin?: AdminInfo): Promise<{ subject: string; html: string }> {
  const customerPortalUrl = `${process.env.CUSTOMER_PORTAL_URL}?id=${lead.id}`;

  console.log(`[Email] Sending welcome email to ${lead.customerEmail} for project "${lead.projectName}"...`);
  const start = Date.now();

  const subject = `Welcome to ${lead.projectName}!`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome, ${lead.customerName}!</h1>
      </div>

      <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
          We're excited to get started on <strong>${lead.projectName}</strong> with you.
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          You can view your project details and stay updated by visiting your personal project portal:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${customerPortalUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px;
                    border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
            View Your Project
          </a>
        </div>
      </div>

      <p style="color: #999; font-size: 13px; text-align: center;">
        If you have any questions, simply reply to this email.
      </p>
    </div>
  `;

  const htmlWithUnsub = html + getUnsubscribeFooter(lead.customerEmail, lead.id);

  const info = await transporter.sendMail({
    from: getFromAddress(admin?.name),
    replyTo: getReplyToAddress(lead.id, admin?.name),
    to: lead.customerEmail,
    subject,
    html: htmlWithUnsub,
  });

  console.log(`[Email] Welcome email sent in ${Date.now() - start}ms. Message ID: ${info.messageId}`);
  return { subject, html: htmlWithUnsub };
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  SOW_READY: "Scope of Work Ready",
  SOW_SIGNED: "Scope of Work Signed",
  DESIGN_READY: "Design Ready",
  DESIGN_APPROVED: "Design Approved",
  BUILD_IN_PROGRESS: "Build In Progress",
  BUILD_READY_FOR_REVIEW: "Build Ready for Review",
  BUILD_SUBMITTED: "Build Submitted",
  GO_LIVE: "Go Live",
};

export async function sendStatusUpdateEmail(
  lead: Lead,
  fromStatus: string,
  toStatus: string,
  admin?: AdminInfo
) {
  const customerPortalUrl = `${process.env.CUSTOMER_PORTAL_URL}?id=${lead.id}`;
  const statusLabel = STATUS_LABELS[toStatus] || toStatus;

  console.log(`[Email] Sending status update to ${lead.customerEmail} — "${fromStatus}" → "${toStatus}"...`);
  const start = Date.now();

  const statusHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Project Status Update</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">${lead.projectName}</p>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            Hi ${lead.customerName},
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Your project status has been updated to:
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 24px; border-radius: 20px; font-size: 18px; font-weight: 600;">
              ${statusLabel}
            </span>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${customerPortalUrl}"
               style="display: inline-block; background: #333; color: white; padding: 14px 32px;
                      border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
              View Project Details
            </a>
          </div>
        </div>

        <p style="color: #999; font-size: 13px; text-align: center;">
          If you have any questions, simply reply to this email.
        </p>
      </div>
    ` + getUnsubscribeFooter(lead.customerEmail, lead.id);

  const info = await transporter.sendMail({
    from: getFromAddress(admin?.name),
    replyTo: getReplyToAddress(lead.id, admin?.name),
    to: lead.customerEmail,
    subject: `${lead.projectName} — Status Update: ${statusLabel}`,
    html: statusHtml,
  });

  console.log(`[Email] Status email sent in ${Date.now() - start}ms. Message ID: ${info.messageId}`);
}

export async function sendNdaReadyEmail(lead: Lead, admin?: AdminInfo): Promise<{ subject: string; html: string }> {
  const ndaUrl = `${process.env.CUSTOMER_PORTAL_URL}?id=${lead.id}&tab=nda`;

  console.log(`[Email] Sending NDA ready email to ${lead.customerEmail}...`);
  const start = Date.now();

  const subject = `NDA Ready for Review — ${lead.projectName}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Non-Disclosure Agreement</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">Ready for Your Review</p>
      </div>

      <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
          Hi ${lead.customerName},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          A Non-Disclosure Agreement for <strong>${lead.projectName}</strong> has been prepared and is ready for your review and signature.
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          You can review the full document online, download a PDF copy, and sign it electronically — all from your project portal.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${ndaUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px;
                    border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
            Review &amp; Sign NDA
          </a>
        </div>
      </div>

      <p style="color: #999; font-size: 13px; text-align: center;">
        If you have any questions, simply reply to this email.
      </p>
    </div>
  `;

  const ndaHtmlWithUnsub = html + getUnsubscribeFooter(lead.customerEmail, lead.id);

  const info = await transporter.sendMail({
    from: getFromAddress(admin?.name),
    replyTo: getReplyToAddress(lead.id, admin?.name),
    to: lead.customerEmail,
    subject,
    html: ndaHtmlWithUnsub,
  });

  console.log(`[Email] NDA ready email sent in ${Date.now() - start}ms. Message ID: ${info.messageId}`);
  return { subject, html: ndaHtmlWithUnsub };
}

interface AdminUser {
  name: string;
  email: string;
  username: string;
}

export async function sendAdminWelcomeEmail(admin: AdminUser) {
  const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
  const companyName = process.env.COMPANY_NAME || "Leads Portal";

  console.log(`[Email] Sending admin welcome email to ${admin.email}...`);
  const start = Date.now();

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@leadsportal.com",
    to: admin.email,
    subject: `Welcome to ${companyName} Admin Portal`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome, ${admin.name}!</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">You've been added as an admin</p>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            Your admin account has been created for the <strong>${companyName}</strong> portal. Here are your login details:
          </p>

          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e0e0e0;">
            <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Username</p>
            <p style="margin: 0 0 16px 0; color: #333; font-size: 18px; font-weight: 600;">${admin.username}</p>
            <p style="margin: 0; color: #666; font-size: 14px;">Admin Portal URL</p>
            <p style="margin: 4px 0 0 0;"><a href="${adminUrl}" style="color: #667eea; font-size: 16px;">${adminUrl}</a></p>
          </div>

          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Please use the password provided by your administrator to log in.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px;
                      border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
              Go to Admin Portal
            </a>
          </div>
        </div>

        <p style="color: #999; font-size: 13px; text-align: center;">
          If you did not expect this email, please contact your administrator.
        </p>
      </div>
    `,
  });

  console.log(`[Email] Admin welcome email sent in ${Date.now() - start}ms. Message ID: ${info.messageId}`);
}

export async function sendSowReadyEmail(
  lead: { customerName: string; customerEmail: string; projectName: string },
  leadId: string,
  version: number,
  admin?: AdminInfo
): Promise<{ subject: string; html: string }> {
  const customerPortalUrl = `${process.env.CUSTOMER_PORTAL_URL}?id=${leadId}&tab=sow`;
  const sowDirectUrl = `${process.env.CUSTOMER_PORTAL_URL}?id=${leadId}&tab=sow&v=${version}`;

  console.log(`[Email] Sending SOW ready email to ${lead.customerEmail} for v${version}...`);
  const start = Date.now();

  const subject = `Scope of Work Ready — ${lead.projectName}`;
  const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Scope of Work</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">Ready for Your Review</p>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            Hi ${lead.customerName},
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            ${version > 1
              ? `An updated Scope of Work (Version ${version}) for <strong>${lead.projectName}</strong> has been prepared and is ready for your review.`
              : `The Scope of Work for <strong>${lead.projectName}</strong> has been prepared and is ready for your review.`
            }
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            This document outlines the project deliverables, timeline, and key milestones. Please review it carefully and let us know if you have any questions.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${sowDirectUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px;
                      border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
              View Scope of Work
            </a>
          </div>

          <div style="text-align: center;">
            <a href="${customerPortalUrl}"
               style="color: #667eea; font-size: 14px; text-decoration: none;">
              Or visit your project portal
            </a>
          </div>
        </div>

        <p style="color: #999; font-size: 13px; text-align: center;">
          If you have any questions, simply reply to this email.
        </p>
      </div>
    `;

  const sowHtmlWithUnsub = html + getUnsubscribeFooter(lead.customerEmail, leadId);

  const info = await transporter.sendMail({
    from: getFromAddress(admin?.name),
    replyTo: getReplyToAddress(leadId, admin?.name),
    to: lead.customerEmail,
    subject,
    html: sowHtmlWithUnsub,
  });

  console.log(`[Email] SOW ready email sent in ${Date.now() - start}ms. Message ID: ${info.messageId}`);
  return { subject, html: sowHtmlWithUnsub };
}

export async function sendLeadAssignedEmail(
  lead: { projectName: string; customerName: string; id: string },
  assignedTo: { name: string; email: string },
  assignedBy?: AdminInfo
) {
  const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
  const leadUrl = `${adminUrl}/leads/${lead.id}`;

  console.log(`[Email] Sending lead assigned email to ${assignedTo.email} for "${lead.projectName}"...`);
  const start = Date.now();

  const info = await transporter.sendMail({
    from: getFromAddress(assignedBy?.name),
    to: assignedTo.email,
    subject: `Lead Assigned to You — ${lead.projectName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Lead Assigned to You</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">${lead.projectName}</p>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            Hi ${assignedTo.name},
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            ${assignedBy ? `<strong>${assignedBy.name}</strong> has assigned` : "You have been assigned"} the lead <strong>${lead.projectName}</strong> (${lead.customerName}) to you.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${leadUrl}"
               style="display: inline-block; background: #01358d; color: white; padding: 14px 32px;
                      border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
              View Lead
            </a>
          </div>
        </div>

        <p style="color: #999; font-size: 13px; text-align: center;">
          You are now watching this lead and will receive updates.
        </p>
      </div>
    `,
  });

  console.log(`[Email] Lead assigned email sent in ${Date.now() - start}ms. Message ID: ${info.messageId}`);
}

export async function sendAppFlowReadyEmail(
  lead: { customerName: string; customerEmail: string; projectName: string },
  leadId: string,
  flowName: string,
  admin?: AdminInfo
): Promise<{ subject: string; html: string }> {
  const portalUrl = `${process.env.CUSTOMER_PORTAL_URL}?id=${leadId}&tab=app-flow`;

  console.log(`[Email] Sending app flow ready email to ${lead.customerEmail}...`);
  const start = Date.now();

  const subject = `App Flow Ready — ${lead.projectName}`;
  const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">App Flow</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">Ready for Your Review</p>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            Hi ${lead.customerName},
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            The app flow diagram <strong>"${flowName}"</strong> for <strong>${lead.projectName}</strong> has been prepared and is ready for your review.
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            This diagram shows the application's user journey and screen flow. Please review it and leave any comments or feedback.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; padding: 14px 32px;
                      border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
              View App Flow
            </a>
          </div>
        </div>

        <p style="color: #999; font-size: 13px; text-align: center;">
          If you have any questions, simply reply to this email.
        </p>
      </div>
    `;

  const flowHtmlWithUnsub = html + getUnsubscribeFooter(lead.customerEmail, leadId);

  const info = await transporter.sendMail({
    from: getFromAddress(admin?.name),
    replyTo: getReplyToAddress(leadId, admin?.name),
    to: lead.customerEmail,
    subject,
    html: flowHtmlWithUnsub,
  });

  console.log(`[Email] App flow ready email sent in ${Date.now() - start}ms. Message ID: ${info.messageId}`);
  return { subject, html: flowHtmlWithUnsub };
}
