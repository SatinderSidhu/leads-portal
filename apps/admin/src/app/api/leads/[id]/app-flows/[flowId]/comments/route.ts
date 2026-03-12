import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; flowId: string }> }
) {
  const { flowId } = await params;

  const comments = await prisma.appFlowComment.findMany({
    where: { appFlowId: flowId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; flowId: string }> }
) {
  const { id, flowId } = await params;

  const flow = await prisma.appFlow.findFirst({
    where: { id: flowId, leadId: id },
  });
  if (!flow) {
    return NextResponse.json({ error: "App flow not found" }, { status: 404 });
  }

  const body = await req.json();
  if (!body.content?.trim()) {
    return NextResponse.json(
      { error: "Comment content is required" },
      { status: 400 }
    );
  }

  const session = await getAdminSession();

  const comment = await prisma.appFlowComment.create({
    data: {
      appFlowId: flowId,
      content: body.content.trim(),
      authorName: session?.name || body.authorName || "Unknown",
      authorType: "admin",
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
