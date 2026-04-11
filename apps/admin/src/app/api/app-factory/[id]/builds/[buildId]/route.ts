import { prisma } from "@leads-portal/database";
import type { AppFactoryBuildStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/session";

const BUILD_NOTIFICATIONS: Record<string, { title: string; body: string; type: string }> = {
  IN_REVIEW: {
    title: "Your app is being reviewed",
    body: "Our team is reviewing your requirements and design. We'll update you when development starts.",
    type: "build_update",
  },
  BUILDING: {
    title: "Development has started!",
    body: "Your app is now being built by our development team. We'll keep you posted on progress.",
    type: "build_update",
  },
  TESTING: {
    title: "Your app is in testing",
    body: "Development is complete and your app is being tested for quality. Almost there!",
    type: "build_update",
  },
  READY: {
    title: "Your app build is ready for review!",
    body: "Great news — your app build is complete and ready for you to review. Check it out!",
    type: "review_ready",
  },
  DELIVERED: {
    title: "🎉 Your app has been delivered!",
    body: "Your app is ready! You can request enhancements anytime from your project page.",
    type: "build_delivered",
  },
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; buildId: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, buildId } = await params;
  try {
    const body = await req.json();
    const { status, notes } = body as { status?: string; notes?: string };

    const data: Record<string, unknown> = {};
    if (status) data.status = status as AppFactoryBuildStatus;
    if (notes !== undefined) data.notes = notes;
    if (status === "DELIVERED") data.deliveredAt = new Date();

    const build = await prisma.appFactoryBuild.update({
      where: { id: buildId },
      data,
      include: { project: { select: { publicId: true, customerEmail: true } } },
    });

    // Update parent project status
    if (status === "DELIVERED") {
      await prisma.appFactoryProject.update({
        where: { id: build.projectId },
        data: { status: "DELIVERED" },
      });
    } else if (status && status !== "SUBMITTED") {
      await prisma.appFactoryProject.update({
        where: { id: build.projectId },
        data: { status: "BUILDING" },
      });
    }

    // Send notification to customer
    if (status && BUILD_NOTIFICATIONS[status] && build.project.customerEmail) {
      const notif = BUILD_NOTIFICATIONS[status];
      try {
        const customer = await prisma.customerUser.findUnique({
          where: { email: build.project.customerEmail },
          select: { id: true },
        });
        if (customer) {
          await prisma.customerNotification.create({
            data: {
              userId: customer.id,
              title: notif.title,
              body: notes ? `${notif.body}\n\nNote from team: ${notes}` : notif.body,
              type: notif.type,
              link: `/project/${build.project.publicId}/status`,
            },
          });
        }
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }
    }

    return NextResponse.json(build);
  } catch {
    return NextResponse.json({ error: "Build not found" }, { status: 404 });
  }
}
