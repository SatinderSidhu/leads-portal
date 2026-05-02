import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../lib/session";
import { notifyDocumentUploaded } from "../../../lib/email";

export async function GET(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  if (!(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const documents = await prisma.leadDocument.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leadId, fileName, s3Key, fileSize, mimeType } = body;

  if (!leadId || !fileName || !s3Key || typeof fileSize !== "number" || !mimeType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Defensive: ensure key was issued for this lead by our presign endpoint
  if (!s3Key.startsWith(`leads/${leadId}/`)) {
    return NextResponse.json({ error: "Invalid s3 key" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, projectName: true },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const doc = await prisma.leadDocument.create({
    data: {
      leadId,
      fileName,
      s3Key,
      fileSize,
      mimeType,
      uploadedBy: session.name,
      uploadedByType: "customer",
      uploadedById: session.id,
    },
  });

  // Audit log
  prisma.auditLog
    .create({
      data: {
        leadId,
        action: "Document Uploaded by Customer",
        detail: `${session.name} uploaded "${fileName}"`,
        actor: `${session.name} (Customer)`,
      },
    })
    .catch(() => {});

  // Notify admin watchers + assigned admin (non-blocking)
  notifyDocumentUploaded(leadId, lead.projectName, session.name, fileName).catch(() => {});

  return NextResponse.json(doc, { status: 201 });
}
