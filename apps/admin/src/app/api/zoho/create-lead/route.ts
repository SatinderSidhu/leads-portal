import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";
import { getZohoConfig, createZohoLead, getZohoLeadUrl } from "../../../../lib/zoho";

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
    return NextResponse.json(
      { error: "Zoho integration is not configured or enabled" },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.zohoLeadId) {
    return NextResponse.json({
      zohoLeadId: lead.zohoLeadId,
      zohoUrl: getZohoLeadUrl(config, lead.zohoLeadId),
      message: "Lead already exists in Zoho",
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

    // Save Zoho lead ID to our database
    await prisma.lead.update({
      where: { id: leadId },
      data: { zohoLeadId: result.zohoLeadId },
    });

    return NextResponse.json({
      zohoLeadId: result.zohoLeadId,
      zohoUrl: getZohoLeadUrl(config, result.zohoLeadId),
      message: "Lead created in Zoho successfully",
    });
  } catch (error) {
    console.error("Zoho create lead error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create lead in Zoho" },
      { status: 500 }
    );
  }
}
