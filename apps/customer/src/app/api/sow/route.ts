import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");

  if (!leadId) {
    return NextResponse.json(
      { error: "leadId is required" },
      { status: 400 }
    );
  }

  // Only return shared SOWs to customers
  const sows = await prisma.scopeOfWork.findMany({
    where: {
      leadId,
      sharedAt: { not: null },
    },
    orderBy: { version: "desc" },
  });

  return NextResponse.json(sows);
}
