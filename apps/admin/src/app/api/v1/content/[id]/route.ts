import { prisma } from "@leads-portal/database";
import type { Platform, ContentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { validateToken, unauthorized } from "../../../../../lib/api-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateToken(req)) return unauthorized();

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
  if (!validateToken(req)) return unauthorized();

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

  const { title, body: postBody, mediaUrl, tags, platforms, status } = body as {
    title?: string;
    body?: string;
    mediaUrl?: string;
    tags?: string[];
    platforms?: string[];
    status?: string;
  };

  const errors: string[] = [];
  if (title !== undefined && !title?.trim()) errors.push("title cannot be empty");
  if (postBody !== undefined && !postBody?.trim()) errors.push("body cannot be empty");

  const validPlatforms = ["LINKEDIN", "FACEBOOK", "TIKTOK", "INSTAGRAM"];
  if (platforms) {
    for (const p of platforms) {
      if (!validPlatforms.includes(p)) {
        errors.push(`Invalid platform: ${p}. Valid: ${validPlatforms.join(", ")}`);
        break;
      }
    }
  }

  const validStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"];
  if (status && !validStatuses.includes(status)) {
    errors.push(`Invalid status: ${status}. Valid: ${validStatuses.join(", ")}`);
  }

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
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateToken(req)) return unauthorized();

  const { id } = await params;
  try {
    await prisma.content.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }
}
