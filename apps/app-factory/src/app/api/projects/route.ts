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

    // Get session to link project to customer
    const { getSession } = await import("../../../lib/session");
    const session = await getSession();

    const project = await prisma.appFactoryProject.create({
      data: {
        publicId,
        idea: idea.trim(),
        platforms: platforms || ["ios", "android"],
        status: "IDEATING",
        customerName: session?.name || null,
        customerEmail: session?.email || null,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const { getSession } = await import("../../../lib/session");
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const projects = await prisma.appFactoryProject.findMany({
      where: { customerEmail: session.email },
      orderBy: { createdAt: "desc" },
      include: {
        builds: { orderBy: { version: "desc" }, take: 1 },
        _count: { select: { builds: true, enhancements: true } },
      },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to list projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
