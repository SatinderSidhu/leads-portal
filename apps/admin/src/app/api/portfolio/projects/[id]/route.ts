import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.portfolioProject.findUnique({
    where: { id },
    include: { service: { select: { id: true, name: true } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const project = await prisma.portfolioProject.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.serviceId !== undefined && { serviceId: body.serviceId || null }),
      ...(body.category !== undefined && { category: body.category || null }),
      ...(body.domain !== undefined && { domain: body.domain || null }),
      ...(body.technologies !== undefined && { technologies: body.technologies }),
      ...(body.customerName !== undefined && { customerName: body.customerName || null }),
      ...(body.customerDetail !== undefined && { customerDetail: body.customerDetail || null }),
      ...(body.demoVideoUrl !== undefined && { demoVideoUrl: body.demoVideoUrl || null }),
      ...(body.documents !== undefined && { documents: body.documents }),
      ...(body.emailScript !== undefined && { emailScript: body.emailScript || null }),
      ...(body.phoneScript !== undefined && { phoneScript: body.phoneScript || null }),
      ...(body.meetingScript !== undefined && { meetingScript: body.meetingScript || null }),
      ...(body.completedAt !== undefined && { completedAt: body.completedAt ? new Date(body.completedAt) : null }),
    },
  });
  return NextResponse.json(project);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.portfolioProject.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
