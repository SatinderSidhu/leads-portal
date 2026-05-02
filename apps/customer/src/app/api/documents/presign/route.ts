import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/session";
import {
  buildDocumentKey,
  getPresignedUploadUrl,
  isAllowedMimeType,
  MAX_DOCUMENT_SIZE,
} from "../../../../lib/s3";

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId, fileName, mimeType, fileSize } = await req.json();

  if (!leadId || !fileName || !mimeType || typeof fileSize !== "number") {
    return NextResponse.json({ error: "leadId, fileName, mimeType, fileSize required" }, { status: 400 });
  }
  if (!(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isAllowedMimeType(mimeType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }
  if (fileSize <= 0 || fileSize > MAX_DOCUMENT_SIZE) {
    return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const s3Key = buildDocumentKey(leadId, fileName);

  try {
    const uploadUrl = await getPresignedUploadUrl(s3Key, mimeType, fileSize);
    return NextResponse.json({ uploadUrl, s3Key });
  } catch (err) {
    console.error("[Customer Document presign] Failed:", err);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
