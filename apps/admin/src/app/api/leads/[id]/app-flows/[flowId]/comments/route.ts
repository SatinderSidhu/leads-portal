import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../../lib/session";
import { logAudit } from "../../../../../../../lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; flowId: string }> }
) {
  const { flowId } = await params;

  const comments = await prisma.appFlowComment.findMany({
    where: { appFlowId: flowId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; flowId: string }> }
) {
  const { id, flowId } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const flow = await prisma.appFlow.findFirst({ where: { id: flowId, leadId: id } });
  if (!flow) return NextResponse.json({ error: "App flow not found" }, { status: 404 });

  const comment = await prisma.appFlowComment.create({
    data: {
      appFlowId: flowId,
      content: content.trim(),
      authorName: session.name,
      authorType: "admin",
    },
  });

  logAudit(id, "App Flow Comment Reply", `"${flow.name}": ${content.trim().slice(0, 80)}`, session.name).catch(() => {});

  // Email notification to customer
  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { customerEmail: true, customerName: true, projectName: true },
    });
    if (lead) {
      const { transporter, getFromAddress, getUnsubscribeFooter, getSystemEmailContent } = await import("../../../../../../../lib/email");
      const portalUrl = `${process.env.CUSTOMER_PORTAL_URL || "https://leadsportal.kitlabs.us"}/project?id=${id}&tab=app-flow`;
      const fallbackHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 20px;">App Flow Comment Reply</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">${lead.projectName} — ${flow.name}</p>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
            <p style="color: #333; font-size: 16px;"><strong>${session.name}</strong> replied to your comment:</p>
            <div style="background: white; border-left: 4px solid #8b5cf6; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #333; font-size: 15px; margin: 0; white-space: pre-wrap;">${content.trim().slice(0, 500)}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalUrl}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View App Flow</a>
            </div>
          </div>
        </div>`;
      const { subject: flowSubj, html: flowReplyHtml } = await getSystemEmailContent("system_app_flow_comment_reply", {
        customerName: lead.customerName, projectName: lead.projectName, adminName: session.name,
        commentContent: content.trim().slice(0, 500), flowUrl: portalUrl, flowName: flow.name,
      }, `Reply to App Flow Comment — ${lead.projectName}`, fallbackHtml);
      await transporter.sendMail({
        from: getFromAddress(session.name),
        to: lead.customerEmail,
        subject: flowSubj,
        html: flowReplyHtml + getUnsubscribeFooter(lead.customerEmail, id),
      });
    }
  } catch (e) {
    console.error("[App Flow Comment Reply] Email failed:", e);
  }

  return NextResponse.json(comment, { status: 201 });
}
