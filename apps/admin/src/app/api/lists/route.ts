import { prisma } from "@leads-portal/database";
import type { ListType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  const where: Prisma.ContactListWhereInput = {};
  if (type === "STATIC" || type === "DYNAMIC") where.type = type;
  if (search) where.name = { contains: search, mode: "insensitive" };

  try {
    const lists = await prisma.contactList.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true, triggeredSequences: true } },
      },
    });
    return NextResponse.json(lists);
  } catch (error) {
    console.error("Failed to fetch lists:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, type, description, isSuppression, filters } = body as {
    name?: string;
    type?: string;
    description?: string;
    isSuppression?: boolean;
    filters?: Prisma.InputJsonValue;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!type || (type !== "STATIC" && type !== "DYNAMIC")) {
    return NextResponse.json({ error: "Type must be STATIC or DYNAMIC" }, { status: 400 });
  }

  try {
    const list = await prisma.contactList.create({
      data: {
        name: name.trim(),
        type: type as ListType,
        description: description?.trim() || null,
        isSuppression: isSuppression || false,
        filters: type === "DYNAMIC" ? (filters || []) : [],
        createdBy: session.name,
      },
    });
    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error("Failed to create list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
