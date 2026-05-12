import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: leadId } = await params;
  const { items } = (await req.json()) as {
    items?: { id: string; sortOrder: number }[];
  };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

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
