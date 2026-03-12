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

  // Only return shared app flows to customers
  const flows = await prisma.appFlow.findMany({
    where: {
      leadId,
      sharedAt: { not: null },
    },
    include: {
      comments: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(flows);
}
