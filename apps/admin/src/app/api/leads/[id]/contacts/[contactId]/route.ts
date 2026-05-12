import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/session";
import { logAudit } from "../../../../../../lib/audit";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, contactId } = await params;

  const existing = await prisma.leadContact.findUnique({ where: { id: contactId } });
  if (!existing || existing.leadId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { name, email, phone, role } = await req.json();
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (trimmedEmail !== existing.email) {
    const lead = await prisma.lead.findUnique({ where: { id }, select: { customerEmail: true } });
    if (lead?.customerEmail?.toLowerCase() === trimmedEmail) {
      return NextResponse.json({ error: "That's the primary contact's email — already on this lead." }, { status: 400 });
    }
    const dupe = await prisma.leadContact.findFirst({
      where: { leadId: id, email: trimmedEmail, NOT: { id: contactId } },
    });
    if (dupe) {
      return NextResponse.json({ error: "That email is already a secondary contact on this lead." }, { status: 409 });
    }
  }

  const updated = await prisma.leadContact.update({
    where: { id: contactId },
    data: {
      name: name.trim(),
      email: trimmedEmail,
      phone: phone?.trim() || null,
      role: role?.trim() || null,
    },
  });

  logAudit(
    id,
    "Secondary Contact Updated",
    `${session.name} edited ${updated.name} <${updated.email}>`,
    session.name,
  ).catch(() => {});

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, contactId } = await params;

  const existing = await prisma.leadContact.findUnique({ where: { id: contactId } });
  if (!existing || existing.leadId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.leadContact.delete({ where: { id: contactId } });

  logAudit(
    id,
    "Secondary Contact Removed",
    `${session.name} removed ${existing.name} <${existing.email}>`,
    session.name,
  ).catch(() => {});

  return NextResponse.json({ success: true });
}
