import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const encoded = searchParams.get("url");

  // Decode the URL
  let targetUrl = "https://kitlabs.us"; // fallback
  if (encoded) {
    try {
      targetUrl = Buffer.from(encoded, "base64url").toString("utf8");
    } catch {
      targetUrl = encoded; // plain URL fallback
    }
  }

  // Record the click (non-blocking — redirect shouldn't wait on DB)
  try {
    const email = await prisma.sentEmail.findUnique({
      where: { id },
      select: { leadId: true, templateId: true, openedAt: true },
    });

    if (email) {
      await prisma.sentEmail.update({
        where: { id },
        data: {
          clickedAt: new Date(),
          ...(email.openedAt ? {} : { status: "OPENED", openedAt: new Date() }),
        },
      });
    }

    // Update SequenceEnrollment.lastAction = CLICKED
    // Only if currently NONE or OPENED — don't downgrade REPLIED
    if (email && email.leadId && email.templateId) {
      prisma.sequenceEnrollment
        .updateMany({
          where: {
            leadId: email.leadId,
            status: "ACTIVE",
            lastAction: { in: ["NONE", "OPENED"] },
            sequence: { steps: { some: { templateId: email.templateId } } },
          },
          data: { lastAction: "CLICKED" },
        })
        .catch(() => {});
    }
  } catch {
    // Silently ignore — email may not exist or already clicked
  }

  // 302 redirect to the original URL
  return NextResponse.redirect(targetUrl, 302);
}
