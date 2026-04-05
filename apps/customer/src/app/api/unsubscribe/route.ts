import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function POST(req: Request) {
  const { email, leadId } = await req.json();

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Find all leads matching this email (or a specific lead)
  const whereClause = leadId
    ? { id: leadId, customerEmail: email.trim().toLowerCase() }
    : { customerEmail: email.trim().toLowerCase() };

  const leads = await prisma.lead.findMany({
    where: { customerEmail: { equals: email.trim(), mode: "insensitive" as const } , ...(leadId ? { id: leadId } : {}) },
    select: {
      id: true,
      projectName: true,
      customerName: true,
      doNotContact: true,
      assignedTo: { select: { email: true, name: true } },
      watchers: { include: { admin: { select: { email: true } } } },
    },
  });

  if (leads.length === 0) {
    return NextResponse.json({ error: "No projects found for this email address." }, { status: 404 });
  }

  // Enable doNotContact on all matching leads
  const updatedLeadIds: string[] = [];
  for (const lead of leads) {
    if (!lead.doNotContact) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { doNotContact: true },
      });
      updatedLeadIds.push(lead.id);

      // Audit log
      await prisma.auditLog.create({
        data: {
          leadId: lead.id,
          action: "Customer Unsubscribed from Emails",
          detail: `${lead.customerName} (${email}) unsubscribed from email communications`,
          actor: `${lead.customerName} (Customer)`,
        },
      }).catch(() => {});
    }
  }

  // Notify assigned admin + watchers for each affected lead
  try {
    const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
    const allAdminEmails = new Set<string>();

    for (const lead of leads) {
      if (lead.assignedTo) allAdminEmails.add(lead.assignedTo.email);
      for (const w of lead.watchers) allAdminEmails.add(w.admin.email);
    }

    if (allAdminEmails.size > 0) {
      const leadNames = leads.map((l) => l.projectName).join(", ");
      const customerName = leads[0].customerName;
      const emailList = Array.from(allAdminEmails);

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@leadsportal.com",
        to: emailList[0],
        ...(emailList.length > 1 && { bcc: emailList.slice(1).join(",") }),
        subject: `Customer Unsubscribed: ${customerName}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Customer Unsubscribed</h1>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
                <strong>${customerName}</strong> (<a href="mailto:${email}" style="color: #01358d;">${email}</a>) has unsubscribed from email communications.
              </p>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                The <strong>Do Not Contact</strong> flag has been automatically enabled for the following project(s): <strong>${leadNames}</strong>.
              </p>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                No further emails will be sent to this customer until the flag is manually disabled.
              </p>
              ${leads.map((l) => `
                <div style="text-align: center; margin: 10px 0;">
                  <a href="${adminUrl}/leads/${l.id}" style="display: inline-block; background: #01358d; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">${l.projectName}</a>
                </div>
              `).join("")}
            </div>
            <p style="color: #999; font-size: 12px; text-align: center;">This is an automated notification from the Customer Portal.</p>
          </div>
        `,
      });
    }
  } catch (e) {
    console.error("[Unsubscribe] Failed to notify admin:", e);
  }

  return NextResponse.json({ success: true, leadsUpdated: updatedLeadIds.length });
}
