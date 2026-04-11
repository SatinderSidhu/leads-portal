import { prisma } from "@leads-portal/database";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession } from "../../../../../../lib/session";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ publicId: string; enhancementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { enhancementId } = await params;
  try {
    const body = await req.json();
    const { description } = body as { description?: string };

    const enhancement = await prisma.appFactoryEnhancement.update({
      where: { id: enhancementId },
      data: {
        ...(description !== undefined && { description }),
      },
    });
    return NextResponse.json(enhancement);
  } catch {
    return NextResponse.json({ error: "Enhancement not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ publicId: string; enhancementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { enhancementId } = await params;
  try {
    await prisma.appFactoryEnhancement.delete({ where: { id: enhancementId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Enhancement not found" }, { status: 404 });
  }
}
