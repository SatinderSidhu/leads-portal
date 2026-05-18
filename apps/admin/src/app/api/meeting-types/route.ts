import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const types = await prisma.meetingType.findMany({
    orderBy: [{ sortOrder: "asc" }, { durationMin: "asc" }],
  });
  return NextResponse.json(types);
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, durationMin, description, isActive, sortOrder } = body as {
    name?: string;
    durationMin?: number;
    description?: string;
    isActive?: boolean;
    sortOrder?: number;
  };
  if (!name?.trim() || !durationMin || durationMin <= 0) {
    return NextResponse.json(
      { error: "name and a positive durationMin are required" },
      { status: 400 }
    );
  }
  const created = await prisma.meetingType.create({
    data: {
      name: name.trim(),
      durationMin,
      description: description?.trim() || null,
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? 0,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
