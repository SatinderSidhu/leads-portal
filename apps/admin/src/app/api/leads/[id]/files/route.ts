import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getAdminSession } from "../../../../../lib/session";

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const files = await prisma.leadFile.findMany({
    where: { leadId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(files);
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

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 25MB)" },
      { status: 400 }
    );
  }

  const session = await getAdminSession();

  const ext = path.extname(file.name) || "";
  const filename = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "leads");

  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(path.join(uploadDir, filename), buffer);

  const filePath = `/uploads/leads/${filename}`;

  const leadFile = await prisma.leadFile.create({
    data: {
      leadId: id,
      fileName: file.name,
      filePath,
      fileSize: file.size,
      fileType: file.type,
      uploadedBy: session?.name || "Unknown",
    },
  });

  return NextResponse.json(leadFile, { status: 201 });
}
