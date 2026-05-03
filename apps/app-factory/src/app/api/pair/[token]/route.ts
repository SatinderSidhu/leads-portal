import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const session = await prisma.pairingSession.findUnique({
    where: { token },
    include: {
      customerUser: { select: { id: true, name: true, email: true } },
    },
  });

  if (!session) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  // Lazily expire
  if (session.status === "PENDING" && session.expiresAt < new Date()) {
    await prisma.pairingSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ status: "EXPIRED" });
  }

  return NextResponse.json({
    status: session.status,
    customerUser: session.customerUser,
    expiresAt: session.expiresAt.toISOString(),
  });
}
