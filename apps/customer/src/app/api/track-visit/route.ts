import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../lib/session";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(req: Request) {
  const { leadId, page } = await req.json();
  if (!leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  const session = await getCustomerSession();

  // Rate limit: only track one visit per lead per 30 minutes
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const recentVisit = await prisma.customerVisit.findFirst({
    where: {
      leadId,
      createdAt: { gte: thirtyMinAgo },
      visitorEmail: session?.email || null,
    },
  });

  if (recentVisit) {
    return NextResponse.json({ tracked: false, reason: "recent_visit" });
  }

  await prisma.customerVisit.create({
    data: {
      leadId,
      visitorEmail: session?.email || null,
      visitorName: session?.name || null,
      page: page || "project",
    },
  });

  // Send notification to watchers + assigned admin
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        projectName: true,
        customerName: true,
        assignedTo: { select: { id: true, email: true } },
        watchers: {
          include: {
            admin: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!lead) return NextResponse.json({ tracked: true });

    // Build recipient list, checking preferences
    const recipientEmails: string[] = [];
    const adminIds: string[] = [];

    for (const w of lead.watchers) {
      adminIds.push(w.adminId);
    }
    if (lead.assignedTo && !adminIds.includes(lead.assignedTo.id)) {
      adminIds.push(lead.assignedTo.id);
    }

    // Check preferences for each admin
    const prefs = await prisma.notificationPreference.findMany({
      where: { adminId: { in: adminIds } },
    });
    const prefsMap = new Map(prefs.map((p) => [p.adminId, p]));

    const allEmails = new Map<string, string>();
    for (const w of lead.watchers) {
      allEmails.set(w.adminId, w.admin.email);
    }
    if (lead.assignedTo) {
      allEmails.set(lead.assignedTo.id, lead.assignedTo.email);
    }

    for (const [adminId, email] of allEmails) {
      const pref = prefsMap.get(adminId);
      // Default is true if no preferences set
      if (!pref || pref.customerPortalVisit !== false) {
        // Check for notification email override
        const notifEmail = pref?.notificationEmail || email;
        recipientEmails.push(notifEmail);
      }
    }

    if (recipientEmails.length > 0) {
      const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
      const visitorName = session?.name || lead.customerName || "A customer";

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@leadsportal.com",
        to: recipientEmails[0],
        ...(recipientEmails.length > 1 && { bcc: recipientEmails.slice(1).join(",") }),
        subject: `Portal Visit: ${lead.projectName}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Customer Portal Visit</h1>
              <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">${lead.projectName}</p>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
                <strong>${visitorName}</strong> visited the customer portal${page ? ` (${page} tab)` : ""}.
              </p>
              <p style="color: #666; font-size: 14px;">
                This is a good time to follow up while they are engaged.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${adminUrl}/leads/${leadId}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View Lead</a>
              </div>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center;">You can manage your notification preferences in the admin portal.</p>
          </div>
        `,
      });
    }
  } catch (error) {
    console.error("[Visit Tracking] Notification failed:", error);
  }

  return NextResponse.json({ tracked: true });
}
