import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

// Public — used by the /book page and the in-portal Book Meeting tab.
// No auth: a cold lead clicking the link in an email campaign needs to
// see meeting options without signing in.
export async function GET() {
  const types = await prisma.meetingType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { durationMin: "asc" }],
    select: {
      id: true,
      name: true,
      durationMin: true,
      description: true,
    },
  });
  return NextResponse.json(types);
}
