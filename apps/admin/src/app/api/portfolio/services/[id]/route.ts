import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await prisma.portfolioService.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(service);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const service = await prisma.portfolioService.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.emailScript !== undefined && { emailScript: body.emailScript || null }),
      ...(body.phoneScript !== undefined && { phoneScript: body.phoneScript || null }),
      ...(body.meetingScript !== undefined && { meetingScript: body.meetingScript || null }),
      ...(body.documents !== undefined && { documents: body.documents }),
      ...(body.urls !== undefined && { urls: body.urls }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
  });
  return NextResponse.json(service);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.portfolioService.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
