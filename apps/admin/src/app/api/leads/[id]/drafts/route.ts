import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";

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

  const draft = await prisma.emailDraft.create({
    data: {
      leadId: id,
      subject: body.subject?.trim() || "",
      body: body.body || "",
      cc: body.cc?.trim() || null,
      bcc: body.bcc?.trim() || null,
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

  const { draftId, subject, body, cc, bcc } = await req.json();
  if (!draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

  const draft = await prisma.emailDraft.findFirst({ where: { id: draftId, leadId: id } });
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  const updated = await prisma.emailDraft.update({
    where: { id: draftId },
    data: {
      ...(subject !== undefined && { subject: subject.trim() }),
      ...(body !== undefined && { body }),
      ...(cc !== undefined && { cc: cc?.trim() || null }),
      ...(bcc !== undefined && { bcc: bcc?.trim() || null }),
    },
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
