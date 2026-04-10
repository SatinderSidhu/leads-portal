import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  try {
    const project = await prisma.appFactoryProject.findUnique({
      where: { publicId },
      include: {
        flows: { orderBy: { version: "desc" }, take: 1 },
        _count: { select: { builds: true, enhancements: true } },
      },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  try {
    const body = await req.json();
    const { customerName, customerEmail, companyName, status } = body as {
      customerName?: string;
      customerEmail?: string;
      companyName?: string;
      status?: string;
    };

    const project = await prisma.appFactoryProject.update({
      where: { publicId },
      data: {
        ...(customerName !== undefined && { customerName }),
        ...(customerEmail !== undefined && { customerEmail }),
        ...(companyName !== undefined && { companyName }),
        ...(status !== undefined && { status: status as "IDEATING" | "DESIGNING" | "SUBMITTED" | "BUILDING" | "DELIVERED" | "ENHANCING" }),
      },
    });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
}
