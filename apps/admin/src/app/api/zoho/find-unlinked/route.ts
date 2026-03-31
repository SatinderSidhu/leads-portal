import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";
import { getZohoConfig, getAccessToken, getZohoLeadUrl } from "../../../../lib/zoho";

function getApiUrl(dataCenter: string): string {
  const urls: Record<string, string> = {
    us: "https://www.zohoapis.com",
    eu: "https://www.zohoapis.eu",
    in: "https://www.zohoapis.in",
    au: "https://www.zohoapis.com.au",
    jp: "https://www.zohoapis.jp",
    ca: "https://www.zohoapis.ca",
  };
  return urls[dataCenter] || urls.us;
}

interface ZohoMatch {
  portalLeadId: string;
  portalName: string;
  portalEmail: string;
  portalProject: string;
  zohoLeadId: string;
  zohoName: string;
  zohoCompany: string;
  zohoUrl: string;
}

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

  // Get all Portal leads that are NOT linked to Zoho
  const unlinkedLeads = await prisma.lead.findMany({
    where: { zohoLeadId: null },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      projectName: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (unlinkedLeads.length === 0) {
    return NextResponse.json({ matches: [], totalUnlinked: 0 });
  }

  // Get unique emails to search
  const uniqueEmails = [...new Set(unlinkedLeads.map((l) => l.customerEmail.toLowerCase()))];

  const token = await getAccessToken(config);
  const apiUrl = getApiUrl(config.dataCenter);

  // Search Zoho for each unique email (batch by searching one at a time)
  const zohoByEmail: Record<string, { id: string; First_Name?: string; Last_Name: string; Company?: string }> = {};

  for (const email of uniqueEmails) {
    try {
      const res = await fetch(
        `${apiUrl}/crm/v7/Leads/search?email=${encodeURIComponent(email)}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      if (res.status === 204) continue;
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        zohoByEmail[email] = data.data[0];
      }
    } catch {
      // Skip failed searches
    }
  }

  // Build matches
  const matches: ZohoMatch[] = [];
  for (const lead of unlinkedLeads) {
    const zohoLead = zohoByEmail[lead.customerEmail.toLowerCase()];
    if (zohoLead) {
      const zohoName = [zohoLead.First_Name, zohoLead.Last_Name].filter(Boolean).join(" ");
      matches.push({
        portalLeadId: lead.id,
        portalName: lead.customerName,
        portalEmail: lead.customerEmail,
        portalProject: lead.projectName,
        zohoLeadId: zohoLead.id,
        zohoName,
        zohoCompany: zohoLead.Company || "",
        zohoUrl: getZohoLeadUrl(config, zohoLead.id),
      });
    }
  }

  return NextResponse.json({
    matches,
    totalUnlinked: unlinkedLeads.length,
    totalMatched: matches.length,
  });
}

// Link a Portal lead to a Zoho lead
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId, zohoLeadId } = await req.json();
  if (!leadId || !zohoLeadId) {
    return NextResponse.json({ error: "leadId and zohoLeadId are required" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.zohoLeadId) {
    return NextResponse.json({ error: "Lead is already linked to Zoho" }, { status: 400 });
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { zohoLeadId },
  });

  return NextResponse.json({ success: true });
}
