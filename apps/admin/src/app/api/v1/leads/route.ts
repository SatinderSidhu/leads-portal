import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { validateToken, unauthorized } from "../../../../lib/api-auth";

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

  const { projectName, customerName, customerEmail, projectDescription } = body as {
    projectName?: string;
    customerName?: string;
    customerEmail?: string;
    projectDescription?: string;
  };

  const errors: string[] = [];
  if (!projectName?.trim()) errors.push("projectName is required");
  if (!customerName?.trim()) errors.push("customerName is required");
  if (!customerEmail?.trim()) errors.push("customerEmail is required");
  if (!projectDescription?.trim()) errors.push("projectDescription is required");

  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    errors.push("customerEmail must be a valid email address");
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
        projectName: (projectName as string).trim(),
        customerName: (customerName as string).trim(),
        customerEmail: (customerEmail as string).trim(),
        projectDescription: (projectDescription as string).trim(),
        source: "AGENT",
      },
    });

    await prisma.statusHistory.create({
      data: {
        leadId: lead.id,
        fromStatus: null,
        toStatus: "NEW",
      },
    });

    return NextResponse.json(
      {
        id: lead.id,
        projectName: lead.projectName,
        customerName: lead.customerName,
        customerEmail: lead.customerEmail,
        projectDescription: lead.projectDescription,
        source: lead.source,
        status: lead.status,
        createdAt: lead.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create lead via API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
