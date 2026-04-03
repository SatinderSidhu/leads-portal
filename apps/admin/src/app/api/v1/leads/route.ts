import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { validateToken, unauthorized } from "../../../../lib/api-auth";

const VALID_SOURCES = [
  "MANUAL", "AGENT", "BARK",
  "LINKEDIN_SALES_NAV", "APOLLO", "LINKEDIN_COMPANY_PAGE",
  "REFERRAL", "WEBSITE", "COLD_OUTREACH", "EVENT", "OTHER",
];

const VALID_STAGES = [
  "COLD", "WARM", "HOT", "ACTIVE", "CLOSED",
  "NEW", "CONTACTED", "RESPONDED", "MEETING_BOOKED",
  "QUALIFIED", "DISQUALIFIED", "NURTURE",
];

export async function GET(req: Request) {
  if (!validateToken(req)) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const status = searchParams.get("status") || "";
  const stage = searchParams.get("stage") || "";
  const source = searchParams.get("source") || "";
  const industry = searchParams.get("industry") || "";
  const assignedTo = searchParams.get("assignedTo") || "";
  const search = searchParams.get("search")?.trim() || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { projectName: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
      { jobTitle: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) where.status = status;
  if (stage) where.stage = stage;
  if (source) where.source = source;
  if (industry) where.industry = { contains: industry, mode: "insensitive" };
  if (assignedTo) where.assignedTo = { name: { contains: assignedTo, mode: "insensitive" } };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: Request) {
  if (!validateToken(req)) {
    return unauthorized();
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const errors: string[] = [];
  if (!(body.projectName as string)?.trim()) errors.push("projectName is required");
  if (!(body.customerName as string)?.trim()) errors.push("customerName is required");
  if (!(body.customerEmail as string)?.trim()) errors.push("customerEmail is required");
  if (!(body.projectDescription as string)?.trim()) errors.push("projectDescription is required");

  if (body.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customerEmail as string)) {
    errors.push("customerEmail must be a valid email address");
  }

  // Validate enum fields
  if (body.leadSource && !VALID_SOURCES.includes(body.leadSource as string)) {
    errors.push(`leadSource must be one of: ${VALID_SOURCES.join(", ")}`);
  }
  if (body.leadStatus && !VALID_STAGES.includes(body.leadStatus as string)) {
    errors.push(`leadStatus must be one of: ${VALID_STAGES.join(", ")}`);
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        projectName: (body.projectName as string).trim(),
        customerName: (body.customerName as string).trim(),
        customerEmail: (body.customerEmail as string).trim(),
        projectDescription: (body.projectDescription as string).trim(),
        phone: (body.phone as string)?.trim() || null,
        city: (body.city as string)?.trim() || null,
        zip: (body.zip as string)?.trim() || null,
        dateCreated: body.dateCreated ? new Date(body.dateCreated as string) : null,
        source: (VALID_SOURCES.includes(body.leadSource as string)
          ? (body.leadSource as string)
          : body.source === "MANUAL" ? "MANUAL" : body.source === "BARK" ? "BARK" : "AGENT") as import("@leads-portal/database").LeadSource,
        stage: (VALID_STAGES.includes(body.leadStatus as string)
          ? (body.leadStatus as string)
          : "COLD") as import("@leads-portal/database").LeadStage,
        // Core contact fields
        jobTitle: (body.jobTitle as string)?.trim() || null,
        companyName: (body.companyName as string)?.trim() || null,
        location: (body.location as string)?.trim() || null,
        linkedinUrl: (body.linkedinUrl as string)?.trim() || null,
        // Company intelligence fields
        industry: (body.industry as string)?.trim() || null,
        companySize: (body.companySize as string)?.trim() || null,
        companyWebsite: (body.companyWebsite as string)?.trim() || null,
        aboutCompany: (body.aboutCompany as string)?.trim() || null,
        // Lead management fields
        extractedDate: body.extractedDate
          ? new Date(body.extractedDate as string)
          : new Date(),
        lastContactedDate: body.lastContactedDate ? new Date(body.lastContactedDate as string) : null,
        leadScore: body.leadScore != null ? parseInt(body.leadScore as string, 10) : null,
        // Outreach tracking
        connectionRequestSent: (body.connectionRequestSent as boolean) ?? false,
        connectionAccepted: (body.connectionAccepted as boolean) ?? false,
        initialMessageSent: (body.initialMessageSent as boolean) ?? false,
        meetingBooked: (body.meetingBooked as boolean) ?? false,
        meetingDate: body.meetingDate ? new Date(body.meetingDate as string) : null,
        responseReceived: (body.responseReceived as boolean) ?? false,
        createdBy: "API",
      },
    });

    await prisma.statusHistory.create({
      data: {
        leadId: lead.id,
        fromStatus: null,
        toStatus: "NEW",
        changedBy: "API",
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Failed to create lead via API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
