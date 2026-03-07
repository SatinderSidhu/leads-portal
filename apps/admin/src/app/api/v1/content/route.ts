import { prisma } from "@leads-portal/database";
import type { Platform, ContentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { validateToken, unauthorized } from "../../../../lib/api-auth";

export async function GET(req: Request) {
  if (!validateToken(req)) return unauthorized();

  const content = await prisma.content.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(content);
}

export async function POST(req: Request) {
  if (!validateToken(req)) return unauthorized();

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
  if (!title?.trim()) errors.push("title is required");
  if (!postBody?.trim()) errors.push("body is required");

  const validPlatforms = ["LINKEDIN", "FACEBOOK", "TIKTOK", "INSTAGRAM"];
  if (platforms && !Array.isArray(platforms)) {
    errors.push("platforms must be an array");
  } else if (platforms) {
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
    const content = await prisma.content.create({
      data: {
        title: (title as string).trim(),
        body: (postBody as string).trim(),
        mediaUrl: mediaUrl || null,
        mediaFile: null,
        tags: tags || [],
        platforms: (platforms as Platform[]) || [],
        status: (status as ContentStatus) || "DRAFT",
      },
    });

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error("Failed to create content via API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
