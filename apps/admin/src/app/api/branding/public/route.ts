import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

// Public endpoint — no auth required (used by customer portal)
export async function GET() {
  const branding = await prisma.brandingConfig.findFirst({
    select: {
      companyName: true,
      logoPath: true,
      website: true,
      primaryColor: true,
      accentColor: true,
      footerText: true,
      copyrightText: true,
    },
  });

  if (!branding) {
    return NextResponse.json({ error: "No branding config found" }, { status: 404 });
  }

  // Replace {year} placeholder with current year
  if (branding.copyrightText) {
    branding.copyrightText = branding.copyrightText.replace(
      /\{year\}/g,
      new Date().getFullYear().toString()
    );
  }

  return NextResponse.json(branding);
}
