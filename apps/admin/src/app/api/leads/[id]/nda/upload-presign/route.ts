import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/session";
import {
  buildNdaKey,
  getPresignedUploadUrl,
  isAllowedNdaMimeType,
  MAX_DOCUMENT_SIZE,
} from "../../../../../../lib/s3";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const { fileName, mimeType, fileSize } = await req.json();

  if (!fileName || !mimeType || typeof fileSize !== "number") {
    return NextResponse.json({ error: "fileName, mimeType, and fileSize required" }, { status: 400 });
  }
  if (!isAllowedNdaMimeType(mimeType)) {
    return NextResponse.json({ error: "Only PDF and Word documents are allowed" }, { status: 400 });
  }
  if (fileSize <= 0 || fileSize > MAX_DOCUMENT_SIZE) {
    return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
  }

  const s3Key = buildNdaKey(id, fileName);

  try {
    const uploadUrl = await getPresignedUploadUrl(s3Key, mimeType, fileSize);
    return NextResponse.json({ uploadUrl, s3Key });
  } catch (err) {
    console.error("[NDA upload presign] Failed:", err);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
