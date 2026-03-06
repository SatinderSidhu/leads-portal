import { prisma } from "@leads-portal/database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("leadId");

  if (!leadId) {
    return NextResponse.json(
      { error: "leadId query parameter is required" },
      { status: 400 }
    );
  }

  const nda = await prisma.nda.findUnique({
    where: { leadId },
    include: {
      lead: {
        select: {
          customerName: true,
          projectName: true,
          customerEmail: true,
        },
      },
    },
  });

  if (!nda) {
    return NextResponse.json({ error: "NDA not found" }, { status: 404 });
  }

  return NextResponse.json(nda);
}
