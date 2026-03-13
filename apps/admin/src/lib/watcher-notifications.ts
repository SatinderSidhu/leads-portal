import { prisma } from "@leads-portal/database";
import { transporter, getFromAddress } from "./email";

type NotificationType = "status_change" | "new_note" | "customer_comment";

interface NotifyWatchersParams {
  leadId: string;
  type: NotificationType;
  excludeAdminId?: string;
  context: Record<string, string>;
}

function buildNotificationEmail(
  type: NotificationType,
  context: Record<string, string>,
  projectName: string,
  leadId: string
): { subject: string; html: string } {
  const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
  const leadUrl = `${adminUrl}/leads/${leadId}`;

  let subject = "";
  let body = "";

  switch (type) {
    case "status_change":
      subject = `Status Update: ${context.toStatus} — ${projectName}`;
      body = `
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
          The status of <strong>${projectName}</strong> has been updated:
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="display: inline-block; background: #e5e7eb; color: #333; padding: 6px 16px; border-radius: 16px; font-size: 14px; text-decoration: line-through;">${context.fromStatus}</span>
          <span style="color: #999; margin: 0 8px;">&rarr;</span>
          <span style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 16px; border-radius: 16px; font-size: 14px; font-weight: 600;">${context.toStatus}</span>
        </div>
        ${context.changedBy ? `<p style="color: #666; font-size: 14px;">Changed by: ${context.changedBy}</p>` : ""}
      `;
      break;

    case "new_note":
      subject = `New Note on ${projectName}`;
      body = `
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
          <strong>${context.createdBy}</strong> added a note on <strong>${projectName}</strong>:
        </p>
        <div style="background: white; border-left: 4px solid #01358d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${(context.noteContent || "").slice(0, 500)}</p>
        </div>
      `;
      break;

    case "customer_comment":
      subject = `New Comment from ${context.commenterName} — ${projectName}`;
      body = `
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
          <strong>${context.commenterName}</strong> left a comment${context.section ? ` on ${context.section}` : ""}:
        </p>
        <div style="background: white; border-left: 4px solid #f9556d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${(context.commentContent || "").slice(0, 500)}</p>
        </div>
      `;
      break;
  }

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Lead Update</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">${projectName}</p>
      </div>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
        ${body}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${leadUrl}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View Lead</a>
        </div>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center;">
        You're receiving this because you're watching this lead.
      </p>
    </div>
  `;

  return { subject, html };
}

export async function notifyWatchers(params: NotifyWatchersParams) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.leadId },
      select: {
        projectName: true,
        assignedToId: true,
        watchers: {
          include: {
            admin: { select: { id: true, email: true, name: true } },
          },
        },
        assignedTo: { select: { id: true, email: true, name: true } },
      },
    });
    if (!lead) return;

    // Build unique recipient list: all watchers + assigned admin, minus excludeAdminId
    const recipientMap = new Map<string, { email: string; name: string }>();
    for (const w of lead.watchers) {
      if (w.adminId !== params.excludeAdminId) {
        recipientMap.set(w.adminId, {
          email: w.admin.email,
          name: w.admin.name,
        });
      }
    }
    if (
      lead.assignedTo &&
      lead.assignedTo.id !== params.excludeAdminId &&
      !recipientMap.has(lead.assignedTo.id)
    ) {
      recipientMap.set(lead.assignedTo.id, {
        email: lead.assignedTo.email,
        name: lead.assignedTo.name,
      });
    }

    if (recipientMap.size === 0) return;

    const { subject, html } = buildNotificationEmail(
      params.type,
      params.context,
      lead.projectName,
      params.leadId
    );

    const emails = Array.from(recipientMap.values()).map((r) => r.email);

    await transporter.sendMail({
      from: getFromAddress(),
      to: emails[0],
      ...(emails.length > 1 && { bcc: emails.slice(1).join(",") }),
      subject,
      html,
    });

    console.log(
      `[Watcher] Notified ${emails.length} watcher(s) for lead ${params.leadId} — ${params.type}`
    );
  } catch (error) {
    console.error("[Watcher] Failed to notify watchers:", error);
  }
}
