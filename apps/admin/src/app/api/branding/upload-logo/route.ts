import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getAdminSession } from "../../../../lib/session";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only image files allowed (JPEG, PNG, GIF, WebP, SVG)" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 5MB)" },
      { status: 400 }
    );
  }

  const ext = path.extname(file.name) || `.${file.type.split("/")[1]}`;
  const filename = `branding-logo-${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "branding");

  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(path.join(uploadDir, filename), buffer);

  const logoPath = `/uploads/branding/${filename}`;

  const existing = await prisma.brandingConfig.findFirst();
  if (!existing) {
    return NextResponse.json({ error: "No branding config found" }, { status: 404 });
  }

  await prisma.brandingConfig.update({
    where: { id: existing.id },
    data: { logoPath, updatedBy: session.name },
  });

  return NextResponse.json({ logoPath }, { status: 201 });
}
