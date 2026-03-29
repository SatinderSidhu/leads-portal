import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";
import { getZohoConfig, searchZohoLead, getZohoLeadUrl } from "../../../../lib/zoho";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  if (!leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  const config = await getZohoConfig();
  if (!config?.enabled || !config.refreshToken) {
    return NextResponse.json({ zohoEnabled: false });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // If we already have a Zoho ID stored, return it
  if (lead.zohoLeadId) {
    return NextResponse.json({
      zohoEnabled: true,
      found: true,
      zohoLeadId: lead.zohoLeadId,
      zohoUrl: getZohoLeadUrl(config, lead.zohoLeadId),
    });
  }

  // Search in Zoho by email
  try {
    const zohoLead = await searchZohoLead(config, lead.customerEmail);
    if (zohoLead) {
      // Save the Zoho ID for future lookups
      await prisma.lead.update({
        where: { id: leadId },
        data: { zohoLeadId: zohoLead.id },
      });

      return NextResponse.json({
        zohoEnabled: true,
        found: true,
        zohoLeadId: zohoLead.id,
        zohoUrl: getZohoLeadUrl(config, zohoLead.id),
      });
    }

    return NextResponse.json({
      zohoEnabled: true,
      found: false,
    });
  } catch (error) {
    console.error("Zoho search error:", error);
    return NextResponse.json({
      zohoEnabled: true,
      found: false,
      error: "Could not search Zoho",
    });
  }
}
