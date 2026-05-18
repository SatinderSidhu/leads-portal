import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { name, durationMin, description, isActive, sortOrder } = body as {
    name?: string;
    durationMin?: number;
    description?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  };
  const updated = await prisma.meetingType.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(durationMin !== undefined && { durationMin }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(isActive !== undefined && { isActive }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  // Soft delete by deactivating — keeps historical bookings linked.
  // Hard delete would fail anyway because MeetingBooking.meetingTypeId
  // is onDelete: Restrict.
  await prisma.meetingType.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
