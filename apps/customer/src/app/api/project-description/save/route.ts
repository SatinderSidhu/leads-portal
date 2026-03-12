import { NextResponse } from "next/server";
import { prisma } from "@leads-portal/database";
import { getCustomerSession } from "../../../../lib/session";

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { leadId: string; description: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.leadId || !body.description?.trim()) {
    return NextResponse.json(
      { error: "leadId and description are required" },
      { status: 400 }
    );
  }

  // Verify lead access
  if (!session.leadIds.includes(body.leadId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: body.leadId },
    select: { id: true },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  await prisma.lead.update({
    where: { id: body.leadId },
    data: {
      projectDescription: body.description.trim(),
      updatedBy: session.name || "Customer",
    },
  });

  return NextResponse.json({ success: true });
}
