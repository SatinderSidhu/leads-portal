import { prisma } from "@leads-portal/database";
import { hash } from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionCookie } from "../../../../lib/session";

export async function POST(req: Request) {
  try {
    const { name, email, password } = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.customerUser.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await hash(password, 10);

    const user = await prisma.customerUser.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        password: hashedPassword,
      },
    });

    // Auto-login after registration
    const session = createSessionCookie(user.id);
    const cookieStore = await cookies();
    cookieStore.set(session.name, session.value, session.options);

    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
