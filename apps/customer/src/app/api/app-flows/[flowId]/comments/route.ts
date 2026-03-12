import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/session";

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

  // Verify the flow exists and is shared
  const flow = await prisma.appFlow.findUnique({
    where: { id: flowId },
  });

  if (!flow || !flow.sharedAt) {
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

  return NextResponse.json(comment, { status: 201 });
}
