import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "../../../../../lib/email";
import { getAdminSession } from "../../../../../lib/session";
import { logAudit } from "../../../../../lib/audit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  try {
    const { subject, html } = await sendWelcomeEmail(lead, { name: session.name });

    // Update emailSent flag
    await prisma.lead.update({
      where: { id },
      data: { emailSent: true },
    });

    // Log in email history
    await prisma.sentEmail.create({
      data: {
        leadId: id,
        subject,
        body: html,
        status: "SENT",
        sentBy: session.name,
      },
    });

    logAudit(id, "Welcome Email Sent", `To: ${lead.customerEmail}`, session.name).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
