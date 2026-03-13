import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { notifyWatchers } from "../../../../../lib/watcher-notifications";

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
