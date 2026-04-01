import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { notifyWatchers } from "../../../../../lib/watcher-notifications";
import { logAudit } from "../../../../../lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content } = await req.json();
  const session = await getAdminSession();
  const adminName = session?.name || "Unknown";

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const note = await prisma.note.create({
    data: { content, leadId: id, createdBy: adminName },
  });

  logAudit(id, "Note Added", content.trim().slice(0, 100), session?.name).catch(() => {});

  // Notify watchers (non-blocking)
  notifyWatchers({
    leadId: id,
    type: "new_note",
    excludeAdminId: session?.id,
    context: {
      createdBy: adminName,
      noteContent: content,
    },
  }).catch(() => {});

  return NextResponse.json(note, { status: 201 });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { noteId, content } = await req.json();
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!noteId || !content?.trim()) {
    return NextResponse.json({ error: "noteId and content are required" }, { status: 400 });
  }

  const note = await prisma.note.findFirst({
    where: { id: noteId, leadId: id },
  });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  if (note.createdBy !== session.name) {
    return NextResponse.json({ error: "You can only edit your own notes" }, { status: 403 });
  }

  const updated = await prisma.note.update({
    where: { id: noteId },
    data: { content: content.trim() },
  });

  logAudit(id, "Note Edited", content.trim().slice(0, 100), session.name).catch(() => {});

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("noteId");
  if (!noteId) {
    return NextResponse.json({ error: "noteId is required" }, { status: 400 });
  }

  const note = await prisma.note.findFirst({
    where: { id: noteId, leadId: id },
  });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  if (note.createdBy !== session.name) {
    return NextResponse.json({ error: "You can only delete your own notes" }, { status: 403 });
  }

  await prisma.note.delete({ where: { id: noteId } });

  logAudit(id, "Note Deleted", note.content.slice(0, 100), session.name).catch(() => {});

  return NextResponse.json({ success: true });
}
