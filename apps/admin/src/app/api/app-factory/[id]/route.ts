import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const project = await prisma.appFactoryProject.findUnique({
      where: { id },
      include: {
        flows: { orderBy: { version: "desc" } },
        builds: { orderBy: { version: "desc" } },
        appStoreConfigs: true,
        enhancements: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    // AppFactoryFlow / Build / AppStoreConfig / Enhancement all cascade on
    // project delete (see schema.prisma), so a single delete is enough.
    const project = await prisma.appFactoryProject.findUnique({
      where: { id },
      select: { id: true, customerEmail: true, idea: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.appFactoryProject.delete({ where: { id } });

    console.log(
      `[AppFactory] ${session.name} deleted project ${id} (customer: ${project.customerEmail ?? "none"})`,
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
