import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../lib/session";
import { notifyLeadWatchers } from "../../../lib/email";

export async function GET(req: Request) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  if (!leadId || !(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const notes = await prisma.note.findMany({
    where: { leadId, createdBy: { endsWith: "(Customer)" } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId, content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (!leadId || !(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { projectName: true },
  });

  if (!lead) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const note = await prisma.note.create({
    data: {
      leadId,
      content: content.trim(),
      createdBy: `${session.name} (Customer)`,
    },
  });

  await prisma.auditLog.create({ data: { leadId, action: "Customer Comment Added", detail: content.trim().slice(0, 100), actor: `${session.name} (Customer)` } }).catch(() => {});

  // Notify watchers (non-blocking)
  notifyLeadWatchers(leadId, lead.projectName, {
    commenterName: session.name,
    commentContent: content.trim(),
    section: "Project Overview",
  }).catch(() => {});

  return NextResponse.json(note, { status: 201 });
}
