import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";

const VALID_STATUSES = ["DRAFT", "APPROVED", "SCHEDULED", "CANCELLED"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const drafts = await prisma.emailDraft.findMany({
    where: { leadId: id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(drafts);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const status = VALID_STATUSES.includes(body.status) ? body.status : "DRAFT";

  const draft = await prisma.emailDraft.create({
    data: {
      leadId: id,
      subject: body.subject?.trim() || "",
      body: body.body || "",
      cc: body.cc?.trim() || null,
      bcc: body.bcc?.trim() || null,
      status,
      scheduledAt: status === "SCHEDULED" && body.scheduledAt ? new Date(body.scheduledAt) : null,
      createdBy: session.name,
    },
  });

  return NextResponse.json(draft, { status: 201 });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { draftId, subject, body, cc, bcc, status, scheduledAt } = await req.json();
  if (!draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

  const draft = await prisma.emailDraft.findFirst({ where: { id: draftId, leadId: id } });
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (subject !== undefined) data.subject = subject.trim();
  if (body !== undefined) data.body = body;
  if (cc !== undefined) data.cc = cc?.trim() || null;
  if (bcc !== undefined) data.bcc = bcc?.trim() || null;
  if (status !== undefined && VALID_STATUSES.includes(status)) {
    data.status = status;
    // Clear scheduledAt if not scheduled
    if (status !== "SCHEDULED") data.scheduledAt = null;
  }
  if (scheduledAt !== undefined) {
    data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
  }

  const updated = await prisma.emailDraft.update({
    where: { id: draftId },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const draftId = searchParams.get("draftId");
  if (!draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

  const draft = await prisma.emailDraft.findFirst({ where: { id: draftId, leadId: id } });
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  await prisma.emailDraft.delete({ where: { id: draftId } });
  return NextResponse.json({ success: true });
}
