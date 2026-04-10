// Next.js startup hook — runs once when the server boots.
// Used to register the node-cron schedule for Smart Sequence email sending.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSequenceCron } = await import("./src/lib/sequence-cron");
    startSequenceCron();
  }
}
