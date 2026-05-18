import cron from "node-cron";
import { prisma } from "@leads-portal/database";
import type { Prisma } from "@prisma/client";

let started = false;

async function callRoute(path: string): Promise<Record<string, unknown>> {
  const url = `http://localhost:3000${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET || ""}` },
  });
  return res.json();
}

type HealthField = "Sequence" | "Draft" | "Archive";

async function tickWithHealth(name: HealthField, path: string): Promise<Record<string, unknown> | null> {
  try {
    const data = await callRoute(path);

    // Upsert health record (non-blocking — cron must not fail on health write)
    const now = new Date();
    const result = data as Prisma.InputJsonValue;

    if (name === "Sequence") {
      await prisma.systemHealth.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", lastSequenceProcessAt: now, lastSequenceProcessResult: result, sequenceProcessConsecutiveFailures: 0 },
        update: { lastSequenceProcessAt: now, lastSequenceProcessResult: result, sequenceProcessConsecutiveFailures: 0 },
      }).catch(() => {});
    } else if (name === "Draft") {
      await prisma.systemHealth.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", lastDraftProcessAt: now, lastDraftProcessResult: result, draftProcessConsecutiveFailures: 0 },
        update: { lastDraftProcessAt: now, lastDraftProcessResult: result, draftProcessConsecutiveFailures: 0 },
      }).catch(() => {});
    } else {
      await prisma.systemHealth.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", lastArchiveAt: now, lastArchiveResult: result },
        update: { lastArchiveAt: now, lastArchiveResult: result },
      }).catch(() => {});
    }

    return data;
  } catch (err) {
    // Increment failure counter
    if (name === "Sequence") {
      prisma.systemHealth.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", sequenceProcessConsecutiveFailures: 1 },
        update: { sequenceProcessConsecutiveFailures: { increment: 1 } },
      }).catch(() => {});
    } else if (name === "Draft") {
      prisma.systemHealth.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", draftProcessConsecutiveFailures: 1 },
        update: { draftProcessConsecutiveFailures: { increment: 1 } },
      }).catch(() => {});
    }

    throw err;
  }
}

export function startSequenceCron() {
  if (started) return;
  if (process.env.SEQUENCE_CRON_ENABLED !== "true") {
    console.log("[sequence-cron] disabled (set SEQUENCE_CRON_ENABLED=true to enable)");
    return;
  }
  if (!process.env.CRON_SECRET) {
    console.error("[sequence-cron] CRON_SECRET not set — refusing to start");
    return;
  }
  started = true;

  // ── Sequence email tick: every minute ───────────────────
  cron.schedule("* * * * *", async () => {
    try {
      const data = await tickWithHealth("Sequence", "/api/sequences/process");
      if (data && ((data.sent as number) > 0 || (data.exited as number) > 0)) {
        console.log("[sequence-cron] process:", data);
      }
    } catch (err) {
      console.error("[sequence-cron] process tick failed:", err);
    }
  });

  // ── Draft email tick: every 5 minutes ───────────────────
  cron.schedule("*/5 * * * *", async () => {
    try {
      const data = await tickWithHealth("Draft", "/api/drafts/process");
      if (data && (data.sent as number) > 0) {
        console.log("[sequence-cron] drafts:", data);
      }
    } catch (err) {
      console.error("[sequence-cron] draft tick failed:", err);
    }
  });

  // ── Enrollment archival: daily at 3 AM UTC ──────────────
  cron.schedule("0 3 * * *", async () => {
    try {
      const data = await tickWithHealth("Archive", "/api/sequences/archive-old");
      console.log("[sequence-cron] archive:", data);
    } catch (err) {
      console.error("[sequence-cron] archive tick failed:", err);
    }
  });

  // ── Zoom provisioning for booked meetings: every 2 min ──
  // Decoupled from the booking write path so a Zoom outage / bad
  // creds doesn't break the customer's confirmation. No health
  // tracking — failure is recorded per-booking in
  // MeetingBooking.conferencingError.
  cron.schedule("*/2 * * * *", async () => {
    try {
      const data = await callRoute("/api/meetings/provision-zoom");
      if (data && ((data.provisioned as number) > 0 || (data.failed as number) > 0)) {
        console.log("[sequence-cron] zoom:", data);
      }
    } catch (err) {
      console.error("[sequence-cron] zoom tick failed:", err);
    }
  });

  console.log("[sequence-cron] scheduled (process: * * * * *, drafts: */5 * * * *, archive: 0 3 * * *, zoom: */2 * * * *)");
}
