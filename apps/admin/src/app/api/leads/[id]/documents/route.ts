import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { logAudit } from "../../../../../lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const documents = await prisma.leadDocument.findMany({
    where: { leadId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const body = await req.json();
  const { fileName, s3Key, fileSize, mimeType } = body;

  if (!fileName || !s3Key || typeof fileSize !== "number" || !mimeType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Defensive: ensure key is scoped to this lead (the presign endpoint sets the scope)
  if (!s3Key.startsWith(`leads/${id}/`)) {
    return NextResponse.json({ error: "Invalid s3 key" }, { status: 400 });
  }

  const doc = await prisma.leadDocument.create({
    data: {
      leadId: id,
      fileName,
      s3Key,
      fileSize,
      mimeType,
      uploadedBy: session.name,
      uploadedByType: "admin",
      uploadedById: session.id,
    },
  });

  logAudit(id, "Document Uploaded", `${session.name} uploaded "${fileName}"`, session.name).catch(() => {});

  return NextResponse.json(doc, { status: 201 });
}
