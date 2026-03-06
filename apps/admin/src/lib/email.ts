import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
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

export async function sendWelcomeEmail(lead: Lead) {
  const customerPortalUrl = `${process.env.CUSTOMER_PORTAL_URL}?id=${lead.id}`;

  await transporter.sendMail({
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
}
