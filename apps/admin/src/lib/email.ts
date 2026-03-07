import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
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

export async function sendWelcomeEmail(lead: Lead) {
  const customerPortalUrl = `${process.env.CUSTOMER_PORTAL_URL}?id=${lead.id}`;

  console.log(`[Email] Sending welcome email to ${lead.customerEmail} for project "${lead.projectName}"...`);
  const start = Date.now();

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@leadsportal.com",
    to: lead.customerEmail,
    subject: `Welcome to ${lead.projectName}!`,
    html: `
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
    `,
  });

  console.log(`[Email] Welcome email sent in ${Date.now() - start}ms. Message ID: ${info.messageId}`);
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
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
  toStatus: string
) {
  const customerPortalUrl = `${process.env.CUSTOMER_PORTAL_URL}?id=${lead.id}`;
  const statusLabel = STATUS_LABELS[toStatus] || toStatus;

  console.log(`[Email] Sending status update to ${lead.customerEmail} — "${fromStatus}" → "${toStatus}"...`);
  const start = Date.now();

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@leadsportal.com",
    to: lead.customerEmail,
    subject: `${lead.projectName} — Status Update: ${statusLabel}`,
    html: `
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
    `,
  });

  console.log(`[Email] Status email sent in ${Date.now() - start}ms. Message ID: ${info.messageId}`);
}

export async function sendNdaReadyEmail(lead: Lead) {
  const ndaUrl = `${process.env.CUSTOMER_PORTAL_URL}?id=${lead.id}&tab=nda`;

  console.log(`[Email] Sending NDA ready email to ${lead.customerEmail}...`);
  const start = Date.now();

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@leadsportal.com",
    to: lead.customerEmail,
    subject: `NDA Ready for Review — ${lead.projectName}`,
    html: `
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
    `,
  });

  console.log(`[Email] NDA ready email sent in ${Date.now() - start}ms. Message ID: ${info.messageId}`);
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
