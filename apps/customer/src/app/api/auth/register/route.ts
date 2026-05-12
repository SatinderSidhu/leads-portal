import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { email, name, password, leadId } = await req.json();

  if (!email?.trim() || !name?.trim() || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if email already exists
  const existing = await prisma.customerUser.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please login instead." },
      { status: 409 }
    );
  }

  // If leadId provided, verify the lead exists and the registering email
  // matches either the primary customer email OR one of the lead's
  // secondary contacts (added by admin so both partners can share a lead).
  const leadIds: string[] = [];
  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { customerEmail: true, contacts: { select: { email: true } } },
    });

    if (lead) {
      const primaryMatches = lead.customerEmail.toLowerCase() === normalizedEmail;
      const secondaryMatches = lead.contacts.some(
        (c) => c.email.toLowerCase() === normalizedEmail,
      );
      if (primaryMatches || secondaryMatches) leadIds.push(leadId);
    }
  }

  // Also find any leads matching this email — either as the primary customer
  // or as a secondary contact.
  const matchingLeads = await prisma.lead.findMany({
    where: {
      OR: [
        { customerEmail: { equals: normalizedEmail, mode: "insensitive" } },
        { contacts: { some: { email: { equals: normalizedEmail, mode: "insensitive" } } } },
      ],
    },
    select: { id: true },
  });

  for (const ml of matchingLeads) {
    if (!leadIds.includes(ml.id)) {
      leadIds.push(ml.id);
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.customerUser.create({
    data: {
      email: normalizedEmail,
      name: name.trim(),
      password: hashedPassword,
      leadIds,
    },
  });

  // Auto-login after registration
  const sessionValue = `${user.id}:${process.env.SESSION_SECRET}`;
  const cookieStore = await cookies();
  cookieStore.set("customer-session", sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return NextResponse.json(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      leadIds: user.leadIds,
    },
    { status: 201 }
  );
}
