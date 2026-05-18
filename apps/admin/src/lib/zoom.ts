/**
 * Zoom Server-to-Server OAuth client.
 *
 * One Zoom app, one host user. The host user is the Zoom account that
 * "owns" every meeting we provision — they show up as host on the call.
 * To use a different host per meeting we'd need each admin's Zoom user
 * mapped to our AdminUser table; deferring to a v2.
 *
 * Env vars expected:
 *   ZOOM_ACCOUNT_ID     — from the Server-to-Server OAuth app
 *   ZOOM_CLIENT_ID      — from the Server-to-Server OAuth app
 *   ZOOM_CLIENT_SECRET  — from the Server-to-Server OAuth app
 *   ZOOM_HOST_USER_ID   — optional; defaults to "me" (the OAuth app owner)
 *
 * Tokens cached in module scope. They expire after ~1 hour; we refresh
 * lazily when the next call sees an expired cache or a 401.
 */

const ZOOM_TOKEN_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}
let tokenCache: CachedToken | null = null;

export function isZoomConfigured(): boolean {
  return Boolean(
    process.env.ZOOM_ACCOUNT_ID &&
      process.env.ZOOM_CLIENT_ID &&
      process.env.ZOOM_CLIENT_SECRET
  );
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Zoom credentials are not configured.");
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(
    `${ZOOM_TOKEN_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${basic}` },
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom token request failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export interface CreateZoomMeetingArgs {
  topic: string;
  startsAt: Date;
  durationMin: number;
  // The attendee's IANA timezone if known — Zoom shows the start time
  // in this zone in their UI. Falls back to America/New_York.
  timezone?: string | null;
  agenda?: string | null;
}

export interface ZoomMeetingResult {
  meetingId: string;
  joinUrl: string;
  startUrl: string;
  password: string | null;
}

export async function createZoomMeeting(
  args: CreateZoomMeetingArgs
): Promise<ZoomMeetingResult> {
  const hostUserId = process.env.ZOOM_HOST_USER_ID || "me";

  const payload = {
    topic: args.topic.slice(0, 200), // Zoom limits topic to 200 chars
    type: 2, // scheduled meeting
    start_time: args.startsAt.toISOString().replace(/\.\d{3}Z$/, "Z"),
    duration: args.durationMin,
    timezone: args.timezone || "America/New_York",
    agenda: args.agenda?.slice(0, 2000) || undefined,
    settings: {
      join_before_host: true,
      // Waiting room off — KITLabs prefers join-before-host for casual
      // calls. Flip if abuse becomes an issue.
      waiting_room: false,
      mute_upon_entry: true,
      auto_recording: "none",
    },
  };

  // One retry on 401 (stale cached token).
  let attempt = 0;
  while (true) {
    attempt++;
    const token = await getAccessToken(attempt > 1);
    const res = await fetch(
      `${ZOOM_API_BASE}/users/${encodeURIComponent(hostUserId)}/meetings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    if (res.status === 401 && attempt < 2) continue;
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Zoom create-meeting failed: ${res.status} ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      id: number | string;
      join_url: string;
      start_url: string;
      password?: string;
    };
    return {
      meetingId: String(data.id),
      joinUrl: data.join_url,
      startUrl: data.start_url,
      password: data.password || null,
    };
  }
}

/**
 * Best-effort cancel. Used when an admin/customer cancels a booking that
 * already has a Zoom meeting attached. Never throws — caller doesn't
 * need to block on Zoom availability.
 */
export async function cancelZoomMeeting(meetingId: string): Promise<void> {
  try {
    const token = await getAccessToken();
    await fetch(`${ZOOM_API_BASE}/meetings/${encodeURIComponent(meetingId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error("[zoom] cancel failed (non-fatal):", err);
  }
}
