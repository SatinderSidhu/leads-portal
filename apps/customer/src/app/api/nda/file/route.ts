import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/session";
import { getPresignedDownloadUrl } from "../../../../lib/s3";

export async function GET(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  const inline = searchParams.get("inline") === "1";

  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });
  if (!(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nda = await prisma.nda.findUnique({ where: { leadId } });
  if (!nda || !nda.s3Key || !nda.fileName) {
    return NextResponse.json({ error: "No uploaded NDA file" }, { status: 404 });
  }

  try {
    const url = await getPresignedDownloadUrl(
      nda.s3Key,
      nda.fileName,
      300,
      inline ? "inline" : "attachment"
    );
    return NextResponse.json({ downloadUrl: url, fileName: nda.fileName, mimeType: nda.mimeType });
  } catch (err) {
    console.error("[Customer NDA file] Failed:", err);
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
  }
}
