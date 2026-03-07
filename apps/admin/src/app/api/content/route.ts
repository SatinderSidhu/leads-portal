import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

export async function GET() {
  const content = await prisma.content.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(content);
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json(
      { error: "Title and body are required" },
      { status: 400 }
    );
  }

  const content = await prisma.content.create({
    data: {
      title: body.title.trim(),
      body: body.body.trim(),
      mediaUrl: body.mediaUrl || null,
      mediaFile: body.mediaFile || null,
      tags: body.tags || [],
      platforms: body.platforms || [],
      status: body.status || "DRAFT",
    },
  });

  return NextResponse.json(content, { status: 201 });
}
