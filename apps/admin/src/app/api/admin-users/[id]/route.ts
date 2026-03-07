import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await prisma.adminUser.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      active: true,
      createdAt: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
  }

  const errors: string[] = [];
  if (body.name !== undefined && !body.name?.trim()) errors.push("name cannot be empty");
  if (body.email !== undefined && !body.email?.trim()) errors.push("email cannot be empty");
  if (body.username !== undefined && !body.username?.trim()) errors.push("username cannot be empty");
  if (body.password !== undefined && body.password.length < 4) errors.push("password must be at least 4 characters");

  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  // Check uniqueness for email/username if changed
  if (body.email && body.email.trim() !== user.email) {
    const existing = await prisma.adminUser.findUnique({ where: { email: body.email.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
  }
  if (body.username && body.username.trim() !== user.username) {
    const existing = await prisma.adminUser.findUnique({ where: { username: body.username.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.email !== undefined) data.email = body.email.trim();
  if (body.username !== undefined) data.username = body.username.trim();
  if (body.active !== undefined) data.active = body.active;
  if (body.password) data.password = await bcrypt.hash(body.password, 10);

  const updated = await prisma.adminUser.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.adminUser.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
  }
}
