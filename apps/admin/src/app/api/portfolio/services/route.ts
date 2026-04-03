import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";

export async function GET() {
  const services = await prisma.portfolioService.findMany({
    include: { projects: { select: { id: true, title: true, category: true } } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(services);
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const service = await prisma.portfolioService.create({
    data: {
      name: body.name,
      description: body.description || "",
      emailScript: body.emailScript || null,
      phoneScript: body.phoneScript || null,
      meetingScript: body.meetingScript || null,
      documents: body.documents || [],
      urls: body.urls || [],
      sortOrder: body.sortOrder || 0,
      createdBy: session.name,
    },
  });
  return NextResponse.json(service, { status: 201 });
}
