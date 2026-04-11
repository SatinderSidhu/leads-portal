import { prisma } from "@leads-portal/database";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const APP_FACTORY_URL = process.env.APP_FACTORY_URL || "https://appfactory.kitlabs.us";

interface NotifyOptions {
  customerEmail: string;
  title: string;
  body: string;
  type: string;
  link?: string;
  systemKey: string;
  mergeData: Record<string, string>;
}

/**
 * Send a notification to an App Factory customer.
 * Creates a CustomerNotification record AND sends an email using a system template.
 * Non-blocking — errors are logged but never thrown.
 */
export async function notifyAppFactoryCustomer(options: NotifyOptions) {
  const { customerEmail, title, body, type, link, systemKey, mergeData } = options;

  try {
    // Find the customer user
    const customer = await prisma.customerUser.findUnique({
      where: { email: customerEmail },
      select: { id: true, name: true },
    });
    if (!customer) return;

    // 1. Create in-app notification
    await prisma.customerNotification.create({
      data: {
        userId: customer.id,
        title,
        body,
        type,
        link: link || null,
      },
    });

    // 2. Send email using system template (with fallback)
    const allMergeData = {
      customerName: customer.name,
      ...mergeData,
      appFactoryUrl: APP_FACTORY_URL,
      projectLink: link ? `${APP_FACTORY_URL}${link}` : APP_FACTORY_URL,
    };

    // Try to load template from DB
    let emailSubject = title;
    let emailHtml = buildFallbackHtml(title, body, allMergeData.projectLink, customer.name);

    try {
      const template = await prisma.emailTemplate.findFirst({
        where: { systemKey },
        select: { subject: true, body: true },
      });
      if (template) {
        emailSubject = mergeTags(template.subject, allMergeData);
        emailHtml = mergeTags(template.body, allMergeData);
      }
    } catch {}

    await transporter.sendMail({
      from: `"App Factory — KITLabs" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: emailSubject,
      html: emailHtml,
    });
  } catch (error) {
    console.error(`[notify] Failed to notify ${customerEmail}:`, error);
  }
}

function mergeTags(text: string, data: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

function buildFallbackHtml(title: string, body: string, projectLink: string, customerName: string): string {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background: linear-gradient(135deg, #2870a8 0%, #01358d 50%, #101b63 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">App Factory</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">by KITLabs</p>
      </div>
      <div style="background: #f8f9fa; border-radius: 0 0 12px 12px; padding: 30px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi ${customerName},</p>
        <h2 style="color: #01358d; font-size: 18px; margin: 16px 0 8px;">${title}</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">${body}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${projectLink}" style="display: inline-block; background: #01358d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View in App Factory</a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-bottom: 0;">
          You're receiving this because you have a project on App Factory by KITLabs.
        </p>
      </div>
    </div>
  `;
}
