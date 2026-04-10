import cron from "node-cron";

let started = false;

async function callRoute(path: string) {
  const url = `http://localhost:3000${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET || ""}` },
  });
  return res.json();
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
      const data = await callRoute("/api/sequences/process");
      if (data && (data.sent > 0 || data.exited > 0 || data.error)) {
        console.log("[sequence-cron] process:", data);
      }
    } catch (err) {
      console.error("[sequence-cron] process tick failed:", err);
    }
  });

  // ── Enrollment archival: daily at 3 AM UTC ──────────────
  cron.schedule("0 3 * * *", async () => {
    try {
      const data = await callRoute("/api/sequences/archive-old");
      console.log("[sequence-cron] archive:", data);
    } catch (err) {
      console.error("[sequence-cron] archive tick failed:", err);
    }
  });

  console.log("[sequence-cron] scheduled (process: * * * * *, archive: 0 3 * * *)");
}
