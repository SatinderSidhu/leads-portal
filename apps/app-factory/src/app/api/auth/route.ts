import { prisma } from "@leads-portal/database";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionCookie, clearSessionCookie } from "../../../lib/session";

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.customerUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "This account uses social login. Please sign in with Google." },
        { status: 401 }
      );
    }

    const valid = await compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const session = createSessionCookie(user.id);
    const cookieStore = await cookies();
    cookieStore.set(session.name, session.value, session.options);

    return NextResponse.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = clearSessionCookie();
  const cookieStore = await cookies();
  cookieStore.set(session.name, session.value, session.options);
  return NextResponse.json({ success: true });
}
