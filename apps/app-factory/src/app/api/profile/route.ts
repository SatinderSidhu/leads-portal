import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getSession } from "../../../lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await prisma.customerUser.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, phone: true, profilePicture: true, companyName: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { name, phone, companyName } = body as { name?: string; phone?: string; companyName?: string };

  try {
    const user = await prisma.customerUser.update({
      where: { id: session.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone.trim() || null }),
        ...(companyName !== undefined && { companyName: companyName.trim() || null }),
      },
      select: { id: true, name: true, email: true, phone: true, profilePicture: true, companyName: true },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
