import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getAdminSession } from "../../../../../lib/session";

const MAX_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const includeDrafts = searchParams.get("includeDrafts") === "true";

  const where: Record<string, unknown> = { leadId: id };
  if (!includeDrafts) {
    where.isDraft = false;
  }

  const sows = await prisma.scopeOfWork.findMany({
    where,
    orderBy: { version: "desc" },
  });

  return NextResponse.json(sows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const session = await getAdminSession();
  const contentType = req.headers.get("content-type") || "";

  // JSON body — AI-generated content save
  if (contentType.includes("application/json")) {
    const body = await req.json();
    const { content, comments, isDraft, sowId } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // If sowId is provided, update existing SOW
    if (sowId) {
      const existing = await prisma.scopeOfWork.findFirst({
        where: { id: sowId, leadId: id },
      });
      if (!existing) {
        return NextResponse.json({ error: "SOW not found" }, { status: 404 });
      }
      const updated = await prisma.scopeOfWork.update({
        where: { id: sowId },
        data: {
          content: content.trim(),
          comments: comments?.trim() || existing.comments,
          isDraft: isDraft ?? existing.isDraft,
        },
      });
      return NextResponse.json(updated);
    }

    // Create new version
    const latestSow = await prisma.scopeOfWork.findFirst({
      where: { leadId: id },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latestSow?.version || 0) + 1;

    const sow = await prisma.scopeOfWork.create({
      data: {
        leadId: id,
        version: nextVersion,
        content: content.trim(),
        isDraft: isDraft ?? false,
        comments: comments?.trim() || null,
        uploadedBy: session?.name || "Unknown",
      },
    });

    return NextResponse.json(sow, { status: 201 });
  }

  // FormData — file upload (existing logic)
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const comments = formData.get("comments") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF and Word documents are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 25MB)" },
      { status: 400 }
    );
  }

  // Determine next version number
  const latestSow = await prisma.scopeOfWork.findFirst({
    where: { leadId: id },
    orderBy: { version: "desc" },
  });
  const nextVersion = (latestSow?.version || 0) + 1;

  const ext = path.extname(file.name) || "";
  const filename = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "sow");

  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));

  const filePath = `/uploads/sow/${filename}`;

  const sow = await prisma.scopeOfWork.create({
    data: {
      leadId: id,
      version: nextVersion,
      fileName: file.name,
      filePath,
      fileSize: file.size,
      fileType: file.type,
      comments: comments?.trim() || null,
      uploadedBy: session?.name || "Unknown",
    },
  });

  return NextResponse.json(sow, { status: 201 });
}
