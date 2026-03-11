import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "../../../lib/email";
import { getAdminSession } from "../../../lib/session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status") || "";
  const stage = searchParams.get("stage") || "";
  const source = searchParams.get("source") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { projectName: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) where.status = status;
  if (stage) where.stage = stage;
  if (source) where.source = source;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const session = await getAdminSession();
  const adminName = session?.name || "Unknown";

  const lead = await prisma.lead.create({
    data: {
      projectName: body.projectName,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      projectDescription: body.projectDescription,
      phone: body.phone?.trim() || null,
      city: body.city?.trim() || null,
      zip: body.zip?.trim() || null,
      dateCreated: body.dateCreated ? new Date(body.dateCreated) : null,
      source: "MANUAL",
      createdBy: adminName,
    },
  });

  await prisma.statusHistory.create({
    data: {
      leadId: lead.id,
      fromStatus: null,
      toStatus: "NEW",
      changedBy: adminName,
    },
  });

  if (body.sendEmail) {
    try {
      await sendWelcomeEmail(lead, session ? { name: session.name } : undefined);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { emailSent: true },
      });
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      // Lead is still saved — return it with a warning
      return NextResponse.json(
        { ...lead, emailWarning: "Lead saved but email failed to send" },
        { status: 201 }
      );
    }
  }

  return NextResponse.json(lead, { status: 201 });
}
