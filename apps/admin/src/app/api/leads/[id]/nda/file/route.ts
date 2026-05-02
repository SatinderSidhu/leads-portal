import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/session";
import { getPresignedDownloadUrl } from "../../../../../../lib/s3";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const inline = new URL(req.url).searchParams.get("inline") === "1";

  const nda = await prisma.nda.findUnique({ where: { leadId: id } });
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
    console.error("[NDA file download] Failed:", err);
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
  }
}
