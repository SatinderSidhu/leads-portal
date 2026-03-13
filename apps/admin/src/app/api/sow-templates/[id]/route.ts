import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getAdminSession } from "../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = await prisma.sowTemplate.findUnique({ where: { id } });

  if (!template) {
    return NextResponse.json(
      { error: "SOW template not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(template);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";

  let name: string | undefined;
  let description: string | undefined;
  let content: string | undefined;
  let industry: string | undefined;
  let projectType: string | undefined;
  let durationRange: string | undefined;
  let costRange: string | undefined;
  let isDefault: boolean | undefined;
  let removeFile = false;
  let newFileName: string | null = null;
  let newFilePath: string | null = null;
  let newFileSize: number | null = null;
  let newFileType: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const val = (key: string) => (formData.get(key) as string) || undefined;
    name = val("name");
    description = val("description");
    content = val("content");
    industry = val("industry");
    projectType = val("projectType");
    durationRange = val("durationRange");
    costRange = val("costRange");
    isDefault = formData.has("isDefault") ? formData.get("isDefault") === "true" : undefined;
    removeFile = formData.get("removeFile") === "true";

    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      const ext = path.extname(file.name).toLowerCase();
      const allowed = [".pdf", ".doc", ".docx"];
      if (!allowed.includes(ext)) {
        return NextResponse.json(
          { error: "Only PDF, DOC, and DOCX files are allowed" },
          { status: 400 }
        );
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "sow-templates");
      await mkdir(uploadDir, { recursive: true });

      const uniqueName = `${randomUUID()}${ext}`;
      const bytes = await file.arrayBuffer();
      await writeFile(path.join(uploadDir, uniqueName), Buffer.from(bytes));

      newFileName = file.name;
      newFilePath = `/uploads/sow-templates/${uniqueName}`;
      newFileSize = file.size;
      newFileType = file.type || `application/${ext.slice(1)}`;
    }
  } else {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    name = body.name as string | undefined;
    description = body.description as string | undefined;
    content = body.content as string | undefined;
    industry = body.industry as string | undefined;
    projectType = body.projectType as string | undefined;
    durationRange = body.durationRange as string | undefined;
    costRange = body.costRange as string | undefined;
    isDefault = body.isDefault as boolean | undefined;
    removeFile = body.removeFile === true;
  }

  const errors: string[] = [];
  if (name !== undefined && !name?.trim()) errors.push("Name cannot be empty");

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  try {
    if (isDefault) {
      await prisma.sowTemplate.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // If replacing or removing file, clean up old file
    if (newFilePath || removeFile) {
      const existing = await prisma.sowTemplate.findUnique({
        where: { id },
        select: { filePath: true },
      });
      if (existing?.filePath) {
        const oldPath = path.join(process.cwd(), "public", existing.filePath);
        try { await unlink(oldPath); } catch { /* file may not exist */ }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(content !== undefined && { content: content.trim() }),
      ...(industry !== undefined && { industry: industry?.trim() || null }),
      ...(projectType !== undefined && { projectType: projectType?.trim() || null }),
      ...(durationRange !== undefined && { durationRange: durationRange?.trim() || null }),
      ...(costRange !== undefined && { costRange: costRange?.trim() || null }),
      ...(isDefault !== undefined && { isDefault }),
      updatedBy: session.name || "Unknown",
    };

    if (newFilePath) {
      data.fileName = newFileName;
      data.filePath = newFilePath;
      data.fileSize = newFileSize;
      data.fileType = newFileType;
    } else if (removeFile) {
      data.fileName = null;
      data.filePath = null;
      data.fileSize = null;
      data.fileType = null;
    }

    const template = await prisma.sowTemplate.update({ where: { id }, data });
    return NextResponse.json(template);
  } catch {
    return NextResponse.json(
      { error: "SOW template not found" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Clean up file if exists
    const template = await prisma.sowTemplate.findUnique({
      where: { id },
      select: { filePath: true },
    });
    if (template?.filePath) {
      const oldPath = path.join(process.cwd(), "public", template.filePath);
      try { await unlink(oldPath); } catch { /* file may not exist */ }
    }

    await prisma.sowTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "SOW template not found" },
      { status: 404 }
    );
  }
}
