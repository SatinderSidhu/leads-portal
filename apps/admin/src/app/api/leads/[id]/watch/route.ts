import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const watchers = await prisma.leadWatcher.findMany({
    where: { leadId: id },
    include: {
      admin: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    watchers.map((w) => ({
      id: w.admin.id,
      name: w.admin.name,
      email: w.admin.email,
    }))
  );
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify lead exists
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  await prisma.leadWatcher.upsert({
    where: {
      leadId_adminId: { leadId: id, adminId: session.id },
    },
    create: { leadId: id, adminId: session.id },
    update: {},
  });

  return NextResponse.json({ success: true, watching: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.leadWatcher.delete({
      where: {
        leadId_adminId: { leadId: id, adminId: session.id },
      },
    });
  } catch {
    // Already not watching — that's fine
  }

  return NextResponse.json({ success: true, watching: false });
}
