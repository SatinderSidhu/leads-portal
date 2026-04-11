import { prisma } from "@leads-portal/database";
import type { AppFactoryBuildStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/session";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; buildId: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { buildId } = await params;
  try {
    const body = await req.json();
    const { status, notes } = body as { status?: string; notes?: string };

    const data: Record<string, unknown> = {};
    if (status) data.status = status as AppFactoryBuildStatus;
    if (notes !== undefined) data.notes = notes;
    if (status === "DELIVERED") data.deliveredAt = new Date();

    const build = await prisma.appFactoryBuild.update({
      where: { id: buildId },
      data,
    });

    // Update parent project status to match
    if (status === "DELIVERED") {
      await prisma.appFactoryProject.update({
        where: { id: build.projectId },
        data: { status: "DELIVERED" },
      });
    } else if (status && status !== "SUBMITTED") {
      await prisma.appFactoryProject.update({
        where: { id: build.projectId },
        data: { status: "BUILDING" },
      });
    }

    return NextResponse.json(build);
  } catch {
    return NextResponse.json({ error: "Build not found" }, { status: 404 });
  }
}
