import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { idea, platforms } = body as { idea?: string; platforms?: string[] };

    if (!idea?.trim()) {
      return NextResponse.json({ error: "Idea is required" }, { status: 400 });
    }

    const publicId = randomBytes(4).toString("hex");

    const project = await prisma.appFactoryProject.create({
      data: {
        publicId,
        idea: idea.trim(),
        platforms: platforms || ["ios", "android"],
        status: "IDEATING",
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const projects = await prisma.appFactoryProject.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to list projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
