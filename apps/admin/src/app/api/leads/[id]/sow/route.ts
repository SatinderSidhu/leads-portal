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
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sows = await prisma.scopeOfWork.findMany({
    where: { leadId: id },
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

  const session = await getAdminSession();

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
