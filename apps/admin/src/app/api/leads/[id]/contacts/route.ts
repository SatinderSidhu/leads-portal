import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";
import { logAudit } from "../../../../../lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const contacts = await prisma.leadContact.findMany({
    where: { leadId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(contacts);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true, customerEmail: true } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const { name, email, phone, role } = await req.json();
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (trimmedEmail === lead.customerEmail?.toLowerCase()) {
    return NextResponse.json({ error: "That's the primary contact's email — already on this lead." }, { status: 400 });
  }

  // Prevent duplicates within the same lead
  const dupe = await prisma.leadContact.findFirst({
    where: { leadId: id, email: trimmedEmail },
  });
  if (dupe) {
    return NextResponse.json({ error: "That email is already a secondary contact on this lead." }, { status: 409 });
  }

  const contact = await prisma.leadContact.create({
    data: {
      leadId: id,
      name: name.trim(),
      email: trimmedEmail,
      phone: phone?.trim() || null,
      role: role?.trim() || null,
      createdBy: session.name,
    },
  });

  logAudit(
    id,
    "Secondary Contact Added",
    `${session.name} added ${contact.name} <${contact.email}>${contact.role ? ` (${contact.role})` : ""}`,
    session.name,
  ).catch(() => {});

  return NextResponse.json(contact, { status: 201 });
}
