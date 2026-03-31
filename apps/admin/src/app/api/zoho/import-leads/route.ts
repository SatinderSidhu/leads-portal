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

interface ZohoRecord {
  id: string;
  First_Name?: string;
  Last_Name: string;
  Email?: string;
  Phone?: string;
  Company?: string;
  Designation?: string;
  Industry?: string;
  Website?: string;
  City?: string;
  State?: string;
  Zip_Code?: string;
  Description?: string;
  Lead_Source?: string;
  Modified_Time?: string;
}

export interface ZohoOnlyLead {
  zohoLeadId: string;
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  phone: string;
  industry: string;
  location: string;
  zohoUrl: string;
}

// GET: Fetch Zoho leads that don't exist in Portal (by email)
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

  const token = await getAccessToken(config);
  const apiUrl = getApiUrl(config.dataCenter);

  // Fetch all Zoho leads with pagination
  const allZohoLeads: ZohoRecord[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const res = await fetch(
        `${apiUrl}/crm/v7/Leads?fields=id,First_Name,Last_Name,Email,Phone,Company,Designation,Industry,Website,City,State,Zip_Code,Description,Lead_Source,Modified_Time&page=${page}&per_page=200`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );

      if (res.status === 204) break;

      const data = await res.json();
      if (data.data && data.data.length > 0) {
        allZohoLeads.push(...data.data);
      }
      hasMore = data.info?.more_records === true;
      page++;
    } catch {
      break;
    }
  }

  if (allZohoLeads.length === 0) {
    return NextResponse.json({ leads: [], totalZoho: 0, totalNew: 0 });
  }

  // Get all Portal lead emails (lowercase) for comparison
  const portalLeads = await prisma.lead.findMany({
    select: { customerEmail: true },
  });
  const portalEmails = new Set(portalLeads.map((l) => l.customerEmail.toLowerCase()));

  // Filter Zoho leads that don't exist in Portal
  const zohoOnlyLeads: ZohoOnlyLead[] = [];
  for (const z of allZohoLeads) {
    const email = (z.Email || "").toLowerCase();
    if (!email || portalEmails.has(email)) continue;

    const name = [z.First_Name, z.Last_Name].filter(Boolean).join(" ");
    zohoOnlyLeads.push({
      zohoLeadId: z.id,
      name,
      email: z.Email || "",
      company: z.Company || "",
      jobTitle: z.Designation || "",
      phone: z.Phone || "",
      industry: z.Industry || "",
      location: [z.City, z.State].filter(Boolean).join(", "),
      zohoUrl: getZohoLeadUrl(config, z.id),
    });
  }

  return NextResponse.json({
    leads: zohoOnlyLeads,
    totalZoho: allZohoLeads.length,
    totalNew: zohoOnlyLeads.length,
  });
}

// POST: Import a Zoho lead into Portal
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { zohoLeadId } = await req.json();
  if (!zohoLeadId) {
    return NextResponse.json({ error: "zohoLeadId is required" }, { status: 400 });
  }

  const config = await getZohoConfig();
  if (!config?.enabled || !config.refreshToken) {
    return NextResponse.json({ error: "Zoho not configured" }, { status: 400 });
  }

  const token = await getAccessToken(config);
  const apiUrl = getApiUrl(config.dataCenter);

  // Fetch full Zoho lead record
  const res = await fetch(`${apiUrl}/crm/v7/Leads/${zohoLeadId}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (res.status === 204) {
    return NextResponse.json({ error: "Lead not found in Zoho" }, { status: 404 });
  }

  const data = await res.json();
  const z = data.data?.[0] as ZohoRecord | undefined;
  if (!z) {
    return NextResponse.json({ error: "Lead not found in Zoho" }, { status: 404 });
  }

  const customerName = [z.First_Name, z.Last_Name].filter(Boolean).join(" ") || "Unknown";
  const customerEmail = z.Email || "";

  if (!customerEmail) {
    return NextResponse.json({ error: "Zoho lead has no email address" }, { status: 400 });
  }

  // Check if already exists in Portal
  const existing = await prisma.lead.findFirst({
    where: { customerEmail: { equals: customerEmail, mode: "insensitive" } },
  });
  if (existing) {
    // Link instead of duplicate
    if (!existing.zohoLeadId) {
      await prisma.lead.update({
        where: { id: existing.id },
        data: { zohoLeadId: z.id },
      });
    }
    return NextResponse.json({
      success: true,
      action: "linked",
      leadId: existing.id,
      message: "Lead already existed in Portal — linked to Zoho record.",
    });
  }

  // Create new lead in Portal
  const lead = await prisma.lead.create({
    data: {
      projectName: `${z.Company || customerName} - Opportunity`,
      customerName,
      customerEmail,
      projectDescription: z.Description || "Imported from Zoho CRM",
      phone: z.Phone || null,
      city: z.City || null,
      zip: z.Zip_Code || null,
      jobTitle: z.Designation || null,
      companyName: z.Company || null,
      location: z.State || null,
      industry: z.Industry || null,
      companyWebsite: z.Website || null,
      linkedinUrl: null,
      source: "OTHER",
      stage: "NEW",
      zohoLeadId: z.id,
      createdBy: `${session.name} (Zoho Import)`,
      ...(session && { assignedToId: session.id }),
    },
  });

  // Auto-add as watcher
  if (session) {
    await prisma.leadWatcher.create({
      data: { leadId: lead.id, adminId: session.id },
    }).catch(() => {});
  }

  // Create status history
  await prisma.statusHistory.create({
    data: {
      leadId: lead.id,
      fromStatus: null,
      toStatus: "NEW",
      changedBy: `${session.name} (Zoho Import)`,
    },
  });

  return NextResponse.json({
    success: true,
    action: "imported",
    leadId: lead.id,
    message: "Lead imported from Zoho successfully.",
  });
}
