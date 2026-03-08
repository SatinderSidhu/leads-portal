import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { fileId } = await params;

  const file = await prisma.leadFile.findUnique({ where: { id: fileId } });
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Delete physical file
  try {
    await unlink(path.join(process.cwd(), "public", file.filePath));
  } catch {
    // File may already be deleted from disk
  }

  await prisma.leadFile.delete({ where: { id: fileId } });

  return NextResponse.json({ success: true });
}
