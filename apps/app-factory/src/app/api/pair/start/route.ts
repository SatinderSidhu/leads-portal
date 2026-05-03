import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function POST() {
  const token = randomBytes(24).toString("base64url"); // ~32 chars
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.pairingSession.create({
    data: {
      token,
      status: "PENDING",
      expiresAt,
    },
  });

  const customerBase = process.env.CUSTOMER_PORTAL_URL || "http://localhost:3001";
  const qrUrl = `${customerBase}/pair?token=${encodeURIComponent(token)}`;

  return NextResponse.json({ token, qrUrl, expiresAt: expiresAt.toISOString() });
}
