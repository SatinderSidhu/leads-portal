import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("serviceId");

  const where = serviceId ? { serviceId } : {};
  const projects = await prisma.portfolioProject.findMany({
    where,
    include: { service: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const project = await prisma.portfolioProject.create({
    data: {
      title: body.title.trim(),
      description: body.description || "",
      serviceId: body.serviceId || null,
      category: body.category || null,
      domain: body.domain || null,
      technologies: body.technologies || [],
      customerName: body.customerName || null,
      customerDetail: body.customerDetail || null,
      demoVideoUrl: body.demoVideoUrl || null,
      documents: body.documents || [],
      emailScript: body.emailScript || null,
      phoneScript: body.phoneScript || null,
      meetingScript: body.meetingScript || null,
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
      createdBy: session.name,
    },
  });
  return NextResponse.json(project, { status: 201 });
}
