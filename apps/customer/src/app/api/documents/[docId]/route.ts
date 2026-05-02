import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/session";
import { deleteS3Object, getPresignedDownloadUrl } from "../../../../lib/s3";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { docId } = await params;

  const doc = await prisma.leadDocument.findUnique({ where: { id: docId } });
  if (!doc || !(session.leadIds as string[]).includes(doc.leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const downloadUrl = await getPresignedDownloadUrl(doc.s3Key, doc.fileName);
    return NextResponse.json({ downloadUrl, fileName: doc.fileName });
  } catch (err) {
    console.error("[Customer Document download] Failed:", err);
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { docId } = await params;

  const doc = await prisma.leadDocument.findUnique({ where: { id: docId } });
  if (!doc || !(session.leadIds as string[]).includes(doc.leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Customers may only delete their own uploads
  if (doc.uploadedByType !== "customer" || doc.uploadedById !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await deleteS3Object(doc.s3Key);
  } catch (err) {
    console.error("[Customer Document delete] S3 delete failed (continuing):", err);
  }

  await prisma.leadDocument.delete({ where: { id: docId } });

  prisma.auditLog
    .create({
      data: {
        leadId: doc.leadId,
        action: "Document Deleted by Customer",
        detail: `${session.name} deleted "${doc.fileName}"`,
        actor: `${session.name} (Customer)`,
      },
    })
    .catch(() => {});

  return NextResponse.json({ success: true });
}
