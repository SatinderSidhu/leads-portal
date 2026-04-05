import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../../lib/session";
import { logAudit } from "../../../../../../../lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; sowId: string }> }
) {
  const { sowId } = await params;

  const comments = await prisma.sowComment.findMany({
    where: { sowId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; sowId: string }> }
) {
  const { id, sowId } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const sow = await prisma.scopeOfWork.findFirst({
    where: { id: sowId, leadId: id },
  });
  if (!sow) return NextResponse.json({ error: "SOW not found" }, { status: 404 });

  const comment = await prisma.sowComment.create({
    data: {
      sowId,
      content: content.trim(),
      authorName: session.name,
      authorType: "admin",
    },
  });

  logAudit(id, "SOW Comment Reply", `v${sow.version}: ${content.trim().slice(0, 80)}`, session.name).catch(() => {});

  // Email notification to customer
  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { customerEmail: true, customerName: true, projectName: true },
    });
    if (lead) {
      const { transporter, getFromAddress, getUnsubscribeFooter } = await import("../../../../../../../lib/email");
      const portalUrl = `${process.env.CUSTOMER_PORTAL_URL || "https://leadsportal.kitlabs.us"}/project?id=${id}&tab=sow&v=${sow.version}`;
      await transporter.sendMail({
        from: getFromAddress(session.name),
        to: lead.customerEmail,
        subject: `Reply to SOW Comment — ${lead.projectName}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 20px;">SOW Comment Reply</h1>
              <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">${lead.projectName} — v${sow.version}</p>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
              <p style="color: #333; font-size: 16px;"><strong>${session.name}</strong> replied to your comment:</p>
              <div style="background: white; border-left: 4px solid #01358d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #333; font-size: 15px; margin: 0; white-space: pre-wrap;">${content.trim().slice(0, 500)}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${portalUrl}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View SOW</a>
              </div>
            </div>
          </div>
        ` + getUnsubscribeFooter(lead.customerEmail, id),
      });
    }
  } catch (e) {
    console.error("[SOW Comment Reply] Email failed:", e);
  }

  return NextResponse.json(comment, { status: 201 });
}
