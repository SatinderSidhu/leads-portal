import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/session";
import { logAudit } from "../../../../../../lib/audit";
import { deleteS3Object, getPresignedDownloadUrl } from "../../../../../../lib/s3";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, docId } = await params;
  const inline = new URL(req.url).searchParams.get("inline") === "1";

  const doc = await prisma.leadDocument.findUnique({ where: { id: docId } });
  if (!doc || doc.leadId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const url = await getPresignedDownloadUrl(
      doc.s3Key,
      doc.fileName,
      300,
      inline ? "inline" : "attachment"
    );
    return NextResponse.json({ downloadUrl: url, fileName: doc.fileName, mimeType: doc.mimeType });
  } catch (err) {
    console.error("[Document download] Failed:", err);
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, docId } = await params;

  const doc = await prisma.leadDocument.findUnique({ where: { id: docId } });
  if (!doc || doc.leadId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await deleteS3Object(doc.s3Key);
  } catch (err) {
    console.error("[Document delete] S3 delete failed (continuing to delete DB record):", err);
  }

  await prisma.leadDocument.delete({ where: { id: docId } });

  logAudit(
    id,
    "Document Deleted",
    `${session.name} deleted "${doc.fileName}"`,
    session.name
  ).catch(() => {});

  return NextResponse.json({ success: true });
}
