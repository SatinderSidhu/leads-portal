import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { sendNotification } from "../../../../lib/notify";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const email = await prisma.sentEmail.update({
      where: { id },
      data: {
        status: "OPENED",
        openedAt: new Date(),
      },
      include: {
        lead: { select: { id: true, projectName: true, customerName: true } },
      },
    });

    // Notify watchers that customer opened the email
    if (email.lead) {
      sendNotification({
        event: "customer_response",
        leadId: email.lead.id,
        subject: `Email Opened: ${email.lead.projectName}`,
        body: `
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            <strong>${email.lead.customerName}</strong> opened the email "<strong>${email.subject}</strong>".
          </p>
        `,
      }).catch(() => {});
    }
  } catch {
    // Silently ignore — email may not exist or already opened
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
