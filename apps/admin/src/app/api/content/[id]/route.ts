import { prisma } from "@leads-portal/database";
import type { Platform, ContentStatus } from "@prisma/client";
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { title, body: postBody, mediaUrl, mediaFile, tags, platforms, status } = body as {
    title?: string;
    body?: string;
    mediaUrl?: string;
    mediaFile?: string;
    tags?: string[];
    platforms?: string[];
    status?: string;
  };

  const errors: string[] = [];
  if (title !== undefined && !title?.trim()) errors.push("title cannot be empty");
  if (postBody !== undefined && !postBody?.trim()) errors.push("body cannot be empty");

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  try {
    const content = await prisma.content.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(postBody !== undefined && { body: postBody.trim() }),
        ...(mediaUrl !== undefined && { mediaUrl }),
        ...(mediaFile !== undefined && { mediaFile }),
        ...(tags !== undefined && { tags }),
        ...(platforms !== undefined && { platforms: platforms as Platform[] }),
        ...(status !== undefined && { status: status as ContentStatus }),
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
