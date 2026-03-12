import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/session";
import { sendAppFlowCommentNotification } from "../../../../../lib/email";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const { flowId } = await params;
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  // Verify the flow exists, is shared, and belongs to a lead the customer owns
  const flow = await prisma.appFlow.findFirst({
    where: {
      id: flowId,
      sharedAt: { not: null },
      leadId: { in: session.leadIds as string[] },
    },
    include: { lead: { select: { customerName: true, customerEmail: true, projectName: true, id: true } } },
  });

  if (!flow) {
    return NextResponse.json(
      { error: "App flow not found" },
      { status: 404 }
    );
  }

  const comment = await prisma.appFlowComment.create({
    data: {
      appFlowId: flowId,
      content: content.trim(),
      authorName: session.name,
      authorType: "customer",
    },
  });

  // Send email notification to admin (non-blocking)
  sendAppFlowCommentNotification(
    flow.lead,
    flow.name,
    session.name,
    content.trim()
  ).catch(() => {});

  return NextResponse.json(comment, { status: 201 });
}
