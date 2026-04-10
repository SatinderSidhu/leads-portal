import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

const BATCH_SIZE = 5000;
const RETENTION_DAYS = 90;

export async function POST(req: Request) {
  // Auth via CRON_SECRET or admin session
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const { getAdminSession } = await import("../../../../lib/session");
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Find eligible enrollments (terminal states older than cutoff)
        const eligible = await tx.sequenceEnrollment.findMany({
          where: {
            status: { in: ["COMPLETED", "EXITED", "REMOVED"] },
            updatedAt: { lt: cutoff },
          },
          take: BATCH_SIZE,
          orderBy: { updatedAt: "asc" },
        });

        if (eligible.length === 0) {
          return { archived: 0, eligibleRemaining: 0 };
        }

        // Copy to archive (status stored as string for stability across enum changes)
        await tx.sequenceEnrollmentArchive.createMany({
          data: eligible.map((e) => ({
            id: e.id,
            sequenceId: e.sequenceId,
            leadId: e.leadId,
            currentStepOrder: e.currentStepOrder,
            status: e.status,
            enrolledAt: e.enrolledAt,
            lastEmailSentAt: e.lastEmailSentAt,
            lastAction: e.lastAction,
            nextSendAt: e.nextSendAt,
            exitReason: e.exitReason,
            retryCount: e.retryCount,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          })),
          skipDuplicates: true,
        });

        // Delete from main table
        await tx.sequenceEnrollment.deleteMany({
          where: { id: { in: eligible.map((e) => e.id) } },
        });

        // Count remaining eligible (so admins can see if more passes are needed)
        const remaining = await tx.sequenceEnrollment.count({
          where: {
            status: { in: ["COMPLETED", "EXITED", "REMOVED"] },
            updatedAt: { lt: cutoff },
          },
        });

        return { archived: eligible.length, eligibleRemaining: remaining };
      },
      {
        timeout: 60 * 1000,
        maxWait: 10 * 1000,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[archive] failed:", error);
    return NextResponse.json({ error: "Archive failed" }, { status: 500 });
  }
}
