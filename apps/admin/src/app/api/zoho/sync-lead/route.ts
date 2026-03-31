import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";
import {
  getZohoConfig,
  getZohoLead,
  updateZohoLead,
  getZohoLeadUrl,
} from "../../../../lib/zoho";

interface FieldChange {
  field: string;
  from: string | null;
  to: string | null;
}

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

  if (!lead.zohoLeadId) {
    return NextResponse.json(
      { error: "Lead is not linked to Zoho. Create it in Zoho first." },
      { status: 400 }
    );
  }

  try {
    // Fetch the Zoho record
    const zohoRecord = await getZohoLead(config, lead.zohoLeadId);
    if (!zohoRecord) {
      return NextResponse.json(
        { error: "Could not find this lead in Zoho CRM. It may have been deleted." },
        { status: 404 }
      );
    }

    const portalTime = new Date(lead.updatedAt).getTime();
    const zohoTime = new Date(zohoRecord.Modified_Time as string).getTime();

    // Within 1 minute = in sync
    if (Math.abs(portalTime - zohoTime) < 60_000) {
      return NextResponse.json({
        direction: "none",
        message: "Already in sync",
        zohoUrl: getZohoLeadUrl(config, lead.zohoLeadId),
      });
    }

    if (portalTime > zohoTime) {
      // Portal is newer → push to Zoho
      const changes = buildPortalToZohoChanges(lead, zohoRecord);

      await updateZohoLead(config, lead.zohoLeadId, {
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

      return NextResponse.json({
        direction: "portal_to_zoho",
        message: "Synced: Leads Portal → Zoho CRM",
        changes,
        zohoUrl: getZohoLeadUrl(config, lead.zohoLeadId),
      });
    } else {
      // Zoho is newer → pull from Zoho
      const zohoFirstName = (zohoRecord.First_Name as string) || "";
      const zohoLastName = (zohoRecord.Last_Name as string) || "";
      const zohoFullName = [zohoFirstName, zohoLastName].filter(Boolean).join(" ");

      const incoming: Record<string, string | null> = {
        customerName: zohoFullName || null,
        customerEmail: (zohoRecord.Email as string) || null,
        phone: (zohoRecord.Phone as string) || null,
        jobTitle: (zohoRecord.Designation as string) || null,
        companyName: (zohoRecord.Company as string) || null,
        location: (zohoRecord.State as string) || null,
        industry: (zohoRecord.Industry as string) || null,
        companyWebsite: (zohoRecord.Website as string) || null,
        projectDescription: (zohoRecord.Description as string) || null,
        city: (zohoRecord.City as string) || null,
        zip: (zohoRecord.Zip_Code as string) || null,
      };

      // Build changes and update data (only fields that actually differ)
      const changes: FieldChange[] = [];
      const updateData: Record<string, string | null> = {};

      const fieldLabels: Record<string, string> = {
        customerName: "Customer Name",
        customerEmail: "Email",
        phone: "Phone",
        jobTitle: "Job Title",
        companyName: "Company Name",
        location: "Location",
        industry: "Industry",
        companyWebsite: "Company Website",
        projectDescription: "Project Description",
        city: "City",
        zip: "Zip Code",
      };

      for (const [key, zohoValue] of Object.entries(incoming)) {
        if (zohoValue === null) continue;
        const portalValue = (lead as Record<string, unknown>)[key] as string | null;
        if (normalize(portalValue) !== normalize(zohoValue)) {
          changes.push({
            field: fieldLabels[key] || key,
            from: portalValue || null,
            to: zohoValue,
          });
          updateData[key] = zohoValue;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            ...updateData,
            updatedBy: "Zoho Sync",
          },
        });
      }

      return NextResponse.json({
        direction: "zoho_to_portal",
        message: "Synced: Zoho CRM → Leads Portal",
        changes,
        zohoUrl: getZohoLeadUrl(config, lead.zohoLeadId),
      });
    }
  } catch (error) {
    console.error("Zoho sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

function normalize(val: string | null | undefined): string {
  return (val || "").trim().toLowerCase();
}

function buildPortalToZohoChanges(
  lead: Record<string, unknown>,
  zohoRecord: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];

  const mappings: [string, string, string][] = [
    ["Customer Name", "customerName", "Full_Name"],
    ["Email", "customerEmail", "Email"],
    ["Phone", "phone", "Phone"],
    ["Job Title", "jobTitle", "Designation"],
    ["Company Name", "companyName", "Company"],
    ["Location", "location", "State"],
    ["Industry", "industry", "Industry"],
    ["Website", "companyWebsite", "Website"],
    ["City", "city", "City"],
    ["Zip Code", "zip", "Zip_Code"],
  ];

  for (const [label, portalKey, zohoKey] of mappings) {
    let portalVal = (lead[portalKey] as string) || "";
    let zohoVal = (zohoRecord[zohoKey] as string) || "";

    // Handle name: Zoho has Full_Name as "First Last"
    if (zohoKey === "Full_Name") {
      const first = (zohoRecord.First_Name as string) || "";
      const last = (zohoRecord.Last_Name as string) || "";
      zohoVal = [first, last].filter(Boolean).join(" ");
    }

    if (normalize(portalVal) !== normalize(zohoVal)) {
      changes.push({
        field: label,
        from: zohoVal || null,
        to: portalVal || null,
      });
    }
  }

  return changes;
}
