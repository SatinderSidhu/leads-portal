import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "../../../lib/email";

export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}

export async function POST(req: Request) {
  const body = await req.json();

  const lead = await prisma.lead.create({
    data: {
      projectName: body.projectName,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      projectDescription: body.projectDescription,
    },
  });

  if (body.sendEmail) {
    try {
      await sendWelcomeEmail(lead);
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
