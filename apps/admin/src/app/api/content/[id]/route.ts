import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const content = await prisma.content.findUnique({ where: { id } });

  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  return NextResponse.json(content);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (!body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json(
      { error: "Title and body are required" },
      { status: 400 }
    );
  }

  try {
    const content = await prisma.content.update({
      where: { id },
      data: {
        title: body.title.trim(),
        body: body.body.trim(),
        mediaUrl: body.mediaUrl ?? undefined,
        mediaFile: body.mediaFile ?? undefined,
        tags: body.tags ?? undefined,
        platforms: body.platforms ?? undefined,
        status: body.status ?? undefined,
      },
    });
    return NextResponse.json(content);
  } catch {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.content.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }
}
