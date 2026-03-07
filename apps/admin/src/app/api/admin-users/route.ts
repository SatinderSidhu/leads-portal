import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sendAdminWelcomeEmail } from "../../../lib/email";

export async function GET() {
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      active: true,
      createdAt: true,
    },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, username, password } = body;
  const active = body.active !== false;

  const errors: string[] = [];
  if (!name?.trim()) errors.push("name is required");
  if (!email?.trim()) errors.push("email is required");
  if (!username?.trim()) errors.push("username is required");
  if (!password || password.length < 4) errors.push("password must be at least 4 characters");

  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  const existing = await prisma.adminUser.findFirst({
    where: { OR: [{ email: email.trim() }, { username: username.trim() }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: existing.email === email.trim() ? "Email already in use" : "Username already taken" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.adminUser.create({
    data: {
      name: name.trim(),
      email: email.trim(),
      username: username.trim(),
      password: hashedPassword,
      active,
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      active: true,
      createdAt: true,
    },
  });

  try {
    await sendAdminWelcomeEmail({ name: user.name, email: user.email, username: user.username });
  } catch (error) {
    console.error("Failed to send admin welcome email:", error);
  }

  return NextResponse.json(user, { status: 201 });
}
