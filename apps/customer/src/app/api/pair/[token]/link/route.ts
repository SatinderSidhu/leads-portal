import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/session";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;

  const pairing = await prisma.pairingSession.findUnique({ where: { token } });
  if (!pairing) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  if (pairing.expiresAt < new Date()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }
  if (pairing.status !== "PENDING") {
    return NextResponse.json({ error: "Already linked" }, { status: 409 });
  }

  await prisma.pairingSession.update({
    where: { id: pairing.id },
    data: { status: "LINKED", customerUserId: session.id },
  });

  return NextResponse.json({ ok: true });
}
