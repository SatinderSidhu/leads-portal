import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";
import { getZohoConfig, createZohoLead, getZohoLeadUrl } from "../../../../lib/zoho";

export interface UnexportedLead {
  id: string;
  customerName: string;
  customerEmail: string;
  projectName: string;
  jobTitle: string | null;
  companyName: string | null;
  industry: string | null;
  location: string | null;
  phone: string | null;
}

// GET: Fetch Portal leads that are NOT linked to Zoho
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getZohoConfig();
  if (!config?.enabled || !config.refreshToken) {
    return NextResponse.json(
      { error: "Zoho integration is not configured or enabled" },
      { status: 400 }
    );
  }

  const leads = await prisma.lead.findMany({
    where: { zohoLeadId: null },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      projectName: true,
      jobTitle: true,
      companyName: true,
      industry: true,
      location: true,
      phone: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    leads,
    total: leads.length,
  });
}

// POST: Export a Portal lead to Zoho
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = await req.json();
  if (!leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  const config = await getZohoConfig();
  if (!config?.enabled || !config.refreshToken) {
    return NextResponse.json({ error: "Zoho not configured" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.zohoLeadId) {
    return NextResponse.json({
      success: true,
      action: "already_linked",
      zohoLeadId: lead.zohoLeadId,
      zohoUrl: getZohoLeadUrl(config, lead.zohoLeadId),
      message: "Lead is already in Zoho.",
    });
  }

  try {
    const result = await createZohoLead(config, {
      customerName: lead.customerName,
      customerEmail: lead.customerEmail,
      projectName: lead.projectName,
      phone: lead.phone,
      city: lead.city,
      zip: lead.zip,
      projectDescription: lead.projectDescription,
      source: lead.source,
      jobTitle: lead.jobTitle,
      companyName: lead.companyName,
      location: lead.location,
      industry: lead.industry,
      companyWebsite: lead.companyWebsite,
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: { zohoLeadId: result.zohoLeadId },
    });

    return NextResponse.json({
      success: true,
      action: "exported",
      zohoLeadId: result.zohoLeadId,
      zohoUrl: getZohoLeadUrl(config, result.zohoLeadId),
      message: "Lead exported to Zoho successfully.",
    });
  } catch (error) {
    console.error("Zoho export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export lead to Zoho" },
      { status: 500 }
    );
  }
}
