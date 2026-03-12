import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

// POST - Login
export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email?.trim() || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = await prisma.customerUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  if (!user.password) {
    return NextResponse.json(
      { error: "This account uses social login. Please sign in with Google or LinkedIn." },
      { status: 401 }
    );
  }

  if (!(await bcrypt.compare(password, user.password))) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const sessionValue = `${user.id}:${process.env.SESSION_SECRET}`;
  const cookieStore = await cookies();
  cookieStore.set("customer-session", sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    leadIds: user.leadIds,
  });
}

// DELETE - Logout
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("customer-session");
  return NextResponse.json({ success: true });
}

// GET - Logout via link (for server-rendered pages)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("logout")) {
    const baseUrl = process.env.CUSTOMER_PORTAL_URL || "http://localhost:3001";
    const cookieStore = await cookies();
    cookieStore.delete("customer-session");
    return NextResponse.redirect(new URL("/", baseUrl));
  }
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
