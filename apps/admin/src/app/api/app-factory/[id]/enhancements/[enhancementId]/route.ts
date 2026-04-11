import { prisma } from "@leads-portal/database";
import type { EnhancementStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/session";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; enhancementId: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { enhancementId } = await params;
  try {
    const body = await req.json();
    const { status } = body as { status?: string };

    const enhancement = await prisma.appFactoryEnhancement.update({
      where: { id: enhancementId },
      data: {
        ...(status && { status: status as EnhancementStatus }),
      },
    });

    return NextResponse.json(enhancement);
  } catch {
    return NextResponse.json({ error: "Enhancement not found" }, { status: 404 });
  }
}
