import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

export async function GET() {
  const sectors = await prisma.naicsSector.findMany({
    include: { subsectors: { orderBy: { code: "asc" } } },
    orderBy: { code: "asc" },
  });

  return NextResponse.json(sectors);
}
