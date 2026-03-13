import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET() {
  try {
    const templates = await prisma.sowTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch SOW templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    name,
    description,
    content,
    industry,
    projectType,
    durationRange,
    costRange,
    isDefault,
  } = body as {
    name?: string;
    description?: string;
    content?: string;
    industry?: string;
    projectType?: string;
    durationRange?: string;
    costRange?: string;
    isDefault?: boolean;
  };

  const errors: string[] = [];
  if (!name?.trim()) errors.push("Name is required");
  if (!content?.trim()) errors.push("Template content is required");

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  try {
    // If setting as default, unset any existing default
    if (isDefault) {
      await prisma.sowTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.sowTemplate.create({
      data: {
        name: name!.trim(),
        description: description?.trim() || null,
        content: content!.trim(),
        industry: industry?.trim() || null,
        projectType: projectType?.trim() || null,
        durationRange: durationRange?.trim() || null,
        costRange: costRange?.trim() || null,
        isDefault: isDefault || false,
        createdBy: session.name || "Unknown",
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Failed to create SOW template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
