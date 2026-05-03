import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const session = await prisma.pairingSession.findUnique({ where: { token } });
  if (!session) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  const expired = session.status === "PENDING" && session.expiresAt < new Date();

  return NextResponse.json({
    status: expired ? "EXPIRED" : session.status,
    expiresAt: session.expiresAt.toISOString(),
  });
}
