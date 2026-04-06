import { prisma } from "@leads-portal/database";
import type { EmailTemplatePurpose } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "system" | "compose" | null (all)

    const where = type === "system"
      ? { systemKey: { not: null } }
      : type === "compose"
        ? { systemKey: null }
        : {};

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch email templates:", error);
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

  const { title, subject, body: templateBody, tags, notes, purpose } = body as {
    title?: string;
    subject?: string;
    body?: string;
    tags?: string[];
    notes?: string;
    purpose?: string;
  };

  const errors: string[] = [];
  if (!title?.trim()) errors.push("Title is required");
  if (!subject?.trim()) errors.push("Subject is required");
  if (!templateBody?.trim()) errors.push("Body is required");

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  try {
    const session = await getAdminSession();
    const template = await prisma.emailTemplate.create({
      data: {
        title: title!.trim(),
        subject: subject!.trim(),
        body: templateBody!.trim(),
        tags: tags || [],
        notes: notes?.trim() || null,
        purpose: (purpose as EmailTemplatePurpose) || "OTHER",
        createdBy: session?.name || "Unknown",
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Failed to create email template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
