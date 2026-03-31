import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";

// GET: Fetch current admin's notification preferences
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let prefs = await prisma.notificationPreference.findUnique({
    where: { adminId: session.id },
  });

  // Return defaults if no preferences saved yet
  if (!prefs) {
    prefs = {
      id: "",
      adminId: session.id,
      notificationEmail: null,
      newLeadCreated: true,
      emailSentToCustomer: true,
      customerResponse: true,
      customerPortalVisit: true,
      customerComment: true,
      leadStatusChange: true,
      leadAssigned: true,
      sowSigned: true,
      ndaSigned: true,
      updatedAt: new Date(),
    };
  }

  return NextResponse.json(prefs);
}

// PUT: Update current admin's notification preferences
export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const prefs = await prisma.notificationPreference.upsert({
    where: { adminId: session.id },
    create: {
      adminId: session.id,
      notificationEmail: body.notificationEmail?.trim() || null,
      newLeadCreated: body.newLeadCreated ?? true,
      emailSentToCustomer: body.emailSentToCustomer ?? true,
      customerResponse: body.customerResponse ?? true,
      customerPortalVisit: body.customerPortalVisit ?? true,
      customerComment: body.customerComment ?? true,
      leadStatusChange: body.leadStatusChange ?? true,
      leadAssigned: body.leadAssigned ?? true,
      sowSigned: body.sowSigned ?? true,
      ndaSigned: body.ndaSigned ?? true,
    },
    update: {
      ...(body.notificationEmail !== undefined && { notificationEmail: body.notificationEmail?.trim() || null }),
      ...(body.newLeadCreated !== undefined && { newLeadCreated: body.newLeadCreated }),
      ...(body.emailSentToCustomer !== undefined && { emailSentToCustomer: body.emailSentToCustomer }),
      ...(body.customerResponse !== undefined && { customerResponse: body.customerResponse }),
      ...(body.customerPortalVisit !== undefined && { customerPortalVisit: body.customerPortalVisit }),
      ...(body.customerComment !== undefined && { customerComment: body.customerComment }),
      ...(body.leadStatusChange !== undefined && { leadStatusChange: body.leadStatusChange }),
      ...(body.leadAssigned !== undefined && { leadAssigned: body.leadAssigned }),
      ...(body.sowSigned !== undefined && { sowSigned: body.sowSigned }),
      ...(body.ndaSigned !== undefined && { ndaSigned: body.ndaSigned }),
    },
  });

  return NextResponse.json(prefs);
}
