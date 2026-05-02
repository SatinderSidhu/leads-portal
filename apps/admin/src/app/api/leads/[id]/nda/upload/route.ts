import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/session";
import { logAudit } from "../../../../../../lib/audit";
import { deleteS3Object } from "../../../../../../lib/s3";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, customerName: true },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const body = await req.json();
  const { fileName, s3Key, fileSize, mimeType, signerName, signedAt } = body;

  if (!fileName || !s3Key || typeof fileSize !== "number" || !mimeType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!s3Key.startsWith(`leads/${id}/nda/`)) {
    return NextResponse.json({ error: "Invalid s3 key" }, { status: 400 });
  }
  if (!signerName?.trim()) {
    return NextResponse.json({ error: "signerName required" }, { status: 400 });
  }

  const signedAtDate = signedAt ? new Date(signedAt) : new Date();
  if (isNaN(signedAtDate.getTime())) {
    return NextResponse.json({ error: "Invalid signedAt date" }, { status: 400 });
  }

  const existing = await prisma.nda.findUnique({ where: { leadId: id } });

  // If replacing an existing externally-uploaded NDA, delete the old S3 object
  if (existing?.s3Key && existing.s3Key !== s3Key) {
    deleteS3Object(existing.s3Key).catch((err) =>
      console.error("[NDA upload] Old S3 delete failed:", err)
    );
  }

  const data = {
    leadId: id,
    content: existing?.content ?? "Externally signed NDA — see attached file.",
    status: "SIGNED" as const,
    signerName: signerName.trim(),
    signedAt: signedAtDate,
    fileName,
    s3Key,
    fileSize,
    mimeType,
    uploadedExternally: true,
    uploadedBy: session.name,
  };

  const nda = existing
    ? await prisma.nda.update({ where: { id: existing.id }, data })
    : await prisma.nda.create({ data });

  logAudit(
    id,
    existing ? "Externally Signed NDA Replaced" : "Externally Signed NDA Uploaded",
    `${session.name} uploaded "${fileName}" (signed by ${signerName.trim()})`,
    session.name
  ).catch(() => {});

  return NextResponse.json(nda, { status: existing ? 200 : 201 });
}
