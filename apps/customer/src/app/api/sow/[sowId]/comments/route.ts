import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/session";
import { sendSowCommentNotification, notifyLeadWatchers } from "../../../../../lib/email";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sowId: string }> }
) {
  const { sowId } = await params;
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sow = await prisma.scopeOfWork.findFirst({
    where: {
      id: sowId,
      sharedAt: { not: null },
      leadId: { in: session.leadIds as string[] },
    },
  });

  if (!sow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const comments = await prisma.sowComment.findMany({
    where: { sowId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sowId: string }> }
) {
  const { sowId } = await params;
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const sow = await prisma.scopeOfWork.findFirst({
    where: {
      id: sowId,
      sharedAt: { not: null },
      leadId: { in: session.leadIds as string[] },
    },
    include: {
      lead: {
        select: { id: true, customerName: true, customerEmail: true, projectName: true },
      },
    },
  });

  if (!sow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const comment = await prisma.sowComment.create({
    data: {
      sowId,
      content: content.trim(),
      authorName: session.name,
      authorType: "customer",
    },
  });

  // Send notification to admin (non-blocking)
  sendSowCommentNotification(
    sow.lead,
    sow.version,
    session.name,
    content.trim()
  ).catch(() => {});

  // Notify watchers (non-blocking)
  notifyLeadWatchers(sow.lead.id, sow.lead.projectName, {
    commenterName: session.name,
    commentContent: content.trim(),
    section: `SOW v${sow.version}`,
  }).catch(() => {});

  return NextResponse.json(comment, { status: 201 });
}
