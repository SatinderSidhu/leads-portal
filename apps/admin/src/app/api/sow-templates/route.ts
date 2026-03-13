import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
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

  const contentType = req.headers.get("content-type") || "";

  let name: string | undefined;
  let description: string | undefined;
  let content: string | undefined;
  let industry: string | undefined;
  let projectType: string | undefined;
  let durationRange: string | undefined;
  let costRange: string | undefined;
  let isDefault: boolean | undefined;
  let fileName: string | null = null;
  let filePath: string | null = null;
  let fileSize: number | null = null;
  let fileType: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    name = (formData.get("name") as string) || undefined;
    description = (formData.get("description") as string) || undefined;
    content = (formData.get("content") as string) || undefined;
    industry = (formData.get("industry") as string) || undefined;
    projectType = (formData.get("projectType") as string) || undefined;
    durationRange = (formData.get("durationRange") as string) || undefined;
    costRange = (formData.get("costRange") as string) || undefined;
    isDefault = formData.get("isDefault") === "true";

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

      fileName = file.name;
      filePath = `/uploads/sow-templates/${uniqueName}`;
      fileSize = file.size;
      fileType = file.type || `application/${ext.slice(1)}`;
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
  }

  const errors: string[] = [];
  if (!name?.trim()) errors.push("Name is required");
  if (!content?.trim() && !filePath) errors.push("Template content or file upload is required");

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  try {
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
        content: content?.trim() || "",
        fileName,
        filePath,
        fileSize,
        fileType,
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
