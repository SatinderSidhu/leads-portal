import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

const MAX_AGE_SECONDS = 5 * 60; // 5 minutes — consider cron dead if no tick in this window

export async function GET() {
  try {
    const health = await prisma.systemHealth.findUnique({
      where: { id: "singleton" },
    });

    if (!health) {
      return NextResponse.json(
        { ok: false, reason: "no health record — cron may not have started yet" },
        { status: 503 }
      );
    }

    const now = Date.now();
    const sequenceAge = health.lastSequenceProcessAt
      ? Math.round((now - health.lastSequenceProcessAt.getTime()) / 1000)
      : null;
    const draftAge = health.lastDraftProcessAt
      ? Math.round((now - health.lastDraftProcessAt.getTime()) / 1000)
      : null;

    const sequenceOk = sequenceAge !== null && sequenceAge < MAX_AGE_SECONDS;
    const draftOk = draftAge !== null && draftAge < MAX_AGE_SECONDS * 5; // drafts run every 5 min — allow 25 min window

    const ok = sequenceOk;

    return NextResponse.json(
      {
        ok,
        sequence: {
          lastTickAt: health.lastSequenceProcessAt,
          ageSeconds: sequenceAge,
          consecutiveFailures: health.sequenceProcessConsecutiveFailures,
          status: sequenceAge === null ? "never" : sequenceAge < 120 ? "healthy" : sequenceAge < 600 ? "warning" : "critical",
        },
        draft: {
          lastTickAt: health.lastDraftProcessAt,
          ageSeconds: draftAge,
          consecutiveFailures: health.draftProcessConsecutiveFailures,
          status: draftAge === null ? "never" : draftAge < 600 ? "healthy" : draftAge < 1800 ? "warning" : "critical",
        },
        archive: {
          lastTickAt: health.lastArchiveAt,
        },
      },
      { status: ok ? 200 : 503 }
    );
  } catch (error) {
    console.error("[health] error:", error);
    return NextResponse.json({ ok: false, reason: "database error" }, { status: 503 });
  }
}
