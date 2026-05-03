import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionCookie } from "../../../../../lib/session";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const session = await prisma.pairingSession.findUnique({ where: { token } });
  if (!session) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  if (session.status !== "LINKED" || !session.customerUserId) {
    return NextResponse.json({ error: "Not linked yet" }, { status: 409 });
  }
  if (session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  // Verify the linked user still exists
  const user = await prisma.customerUser.findUnique({
    where: { id: session.customerUserId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Mark redeemed (one-shot)
  await prisma.pairingSession.update({
    where: { id: session.id },
    data: { status: "REDEEMED", redeemedAt: new Date() },
  });

  // Set the AppFactory session cookie
  const cookie = createSessionCookie(user.id);
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.options);

  return NextResponse.json({ user });
}
