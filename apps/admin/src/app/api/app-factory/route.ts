import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const projects = await prisma.appFactoryProject.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        builds: { orderBy: { version: "desc" }, take: 1 },
        _count: { select: { builds: true, enhancements: true, appStoreConfigs: true } },
      },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch app factory projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
