import { prisma } from "@leads-portal/database";
import type { EnhancementStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/session";
import { notifyAppFactoryCustomer } from "../../../../../../lib/notify-appfactory";

const ENHANCEMENT_NOTIFICATIONS: Record<string, { title: string; body: string }> = {
  REVIEWED: { title: "Your enhancement has been reviewed", body: "Our team has reviewed your enhancement request and is evaluating the changes needed." },
  APPROVED: { title: "Enhancement approved!", body: "Your enhancement request has been approved and will be included in the next build." },
  BUILDING: { title: "Enhancement is being built", body: "Development has started on your enhancement. We'll notify you when it's ready." },
  DELIVERED: { title: "Enhancement delivered!", body: "Your enhancement has been completed and deployed. Check it out!" },
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; enhancementId: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { enhancementId } = await params;
  try {
    const body = await req.json();
    const { status } = body as { status?: string };

    const enhancement = await prisma.appFactoryEnhancement.update({
      where: { id: enhancementId },
      data: { ...(status && { status: status as EnhancementStatus }) },
      include: { project: { select: { publicId: true, customerEmail: true } } },
    });

    // Notify customer (in-app + email)
    if (status && ENHANCEMENT_NOTIFICATIONS[status] && enhancement.project.customerEmail) {
      const notif = ENHANCEMENT_NOTIFICATIONS[status];
      notifyAppFactoryCustomer({
        customerEmail: enhancement.project.customerEmail,
        title: notif.title,
        body: notif.body,
        type: "enhancement_update",
        link: `/project/${enhancement.project.publicId}/enhance`,
        systemKey: "system_appfactory_enhancement_update",
        mergeData: {
          statusTitle: notif.title,
          statusBody: notif.body,
          projectLink: `/project/${enhancement.project.publicId}/enhance`,
        },
      }).catch(() => {});
    }

    return NextResponse.json(enhancement);
  } catch {
    return NextResponse.json({ error: "Enhancement not found" }, { status: 404 });
  }
}
