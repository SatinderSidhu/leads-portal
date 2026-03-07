import { cookies } from "next/headers";
import { prisma } from "@leads-portal/database";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  const admin = await prisma.adminUser.findUnique({
    where: { username },
  });

  if (!admin || !admin.active) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  (await cookies()).set("admin-session", `${admin.id}:${process.env.SESSION_SECRET!}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });

  return NextResponse.json({ success: true, name: admin.name });
}

export async function DELETE() {
  (await cookies()).delete("admin-session");
  return NextResponse.json({ success: true });
}
