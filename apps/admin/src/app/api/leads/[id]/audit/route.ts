import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const logs = await prisma.auditLog.findMany({
    where: { leadId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}
