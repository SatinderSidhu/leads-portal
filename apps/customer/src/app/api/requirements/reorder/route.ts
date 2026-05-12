import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/session";

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId, items } = (await req.json()) as {
    leadId?: string;
    items?: { id: string; sortOrder: number }[];
  };

  if (!leadId || !(session.leadIds as string[]).includes(leadId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  // Make sure every id belongs to this lead — single query, then map.
  const rows = await prisma.requirement.findMany({
    where: { id: { in: items.map((i) => i.id) } },
    select: { id: true, leadId: true },
  });
  for (const r of rows) {
    if (r.leadId !== leadId) {
      return NextResponse.json({ error: "Mixed-lead reorder rejected" }, { status: 400 });
    }
  }

  await prisma.$transaction(
    items.map((i) =>
      prisma.requirement.update({
        where: { id: i.id },
        data: { sortOrder: i.sortOrder },
      }),
    ),
  );

  return NextResponse.json({ success: true });
}
