import { prisma } from "@leads-portal/database";
import type { Platform, ContentStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const content = await prisma.content.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(content);
  } catch (error) {
    console.error("Failed to fetch content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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

  if (!title?.trim() || !postBody?.trim()) {
    return NextResponse.json(
      { error: "Title and body are required" },
      { status: 400 }
    );
  }

  try {
    const content = await prisma.content.create({
      data: {
        title: title.trim(),
        body: postBody.trim(),
        mediaUrl: mediaUrl || null,
        mediaFile: mediaFile || null,
        tags: tags || [],
        platforms: (platforms as Platform[]) || [],
        status: (status as ContentStatus) || "DRAFT",
      },
    });

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error("Failed to create content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
