import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

// Public endpoint — returns branding config for document rendering
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
    return NextResponse.json(null);
  }

  // Replace {year} placeholder
  if (branding.copyrightText) {
    branding.copyrightText = branding.copyrightText.replace(
      /\{year\}/g,
      new Date().getFullYear().toString()
    );
  }

  // Convert logo path to absolute URL using admin portal
  const adminUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
  if (branding.logoPath && !branding.logoPath.startsWith("http")) {
    branding.logoPath = `${adminUrl}${branding.logoPath}`;
  }

  return NextResponse.json(branding);
}
