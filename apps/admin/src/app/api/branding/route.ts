import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branding = await prisma.brandingConfig.findFirst();
  if (!branding) {
    return NextResponse.json({ error: "No branding config found" }, { status: 404 });
  }

  return NextResponse.json(branding);
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { companyName, website, primaryColor, accentColor, footerText, copyrightText } = body;

  const existing = await prisma.brandingConfig.findFirst();
  if (!existing) {
    return NextResponse.json({ error: "No branding config found" }, { status: 404 });
  }

  const updated = await prisma.brandingConfig.update({
    where: { id: existing.id },
    data: {
      ...(companyName !== undefined && { companyName }),
      ...(website !== undefined && { website }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(accentColor !== undefined && { accentColor }),
      ...(footerText !== undefined && { footerText }),
      ...(copyrightText !== undefined && { copyrightText }),
      updatedBy: session.name,
    },
  });

  return NextResponse.json(updated);
}
