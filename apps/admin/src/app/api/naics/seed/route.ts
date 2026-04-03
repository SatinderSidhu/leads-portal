import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";
import naicsData from "../../../../lib/naics-data.json";

export async function POST() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let sectorsCreated = 0;
  let subsectorsCreated = 0;

  // Create sectors
  for (const sector of naicsData.sectors) {
    const existing = await prisma.naicsSector.findUnique({ where: { code: sector.code } });
    if (!existing) {
      await prisma.naicsSector.create({ data: { code: sector.code, name: sector.name } });
      sectorsCreated++;
    }
  }

  // Create subsectors
  for (const sub of naicsData.subsectors) {
    const existing = await prisma.naicsSubsector.findUnique({ where: { code: sub.code } });
    if (existing) continue;

    // Find parent sector
    const parentSector = await prisma.naicsSector.findFirst({
      where: { name: sub.parentSector },
    });
    if (!parentSector) continue;

    await prisma.naicsSubsector.create({
      data: { code: sub.code, name: sub.name, sectorId: parentSector.id },
    });
    subsectorsCreated++;
  }

  return NextResponse.json({ sectorsCreated, subsectorsCreated });
}
