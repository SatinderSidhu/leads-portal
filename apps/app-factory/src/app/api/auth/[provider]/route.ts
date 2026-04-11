import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

const PROVIDERS: Record<string, { authUrl: string; scopes: string }> = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: "openid email profile",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    scopes: "openid profile email",
  },
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const config = PROVIDERS[provider];
  if (!config) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get("returnTo") || "/start";

  const clientId = provider === "google"
    ? process.env.GOOGLE_CLIENT_ID
    : process.env.LINKEDIN_CLIENT_ID;

  const baseUrl = process.env.APP_FACTORY_URL || process.env.CUSTOMER_PORTAL_URL || "http://localhost:3002";
  const redirectUri = `${baseUrl}/api/auth/${provider}/callback`;

  // CSRF protection
  const csrf = randomUUID();
  const state = Buffer.from(JSON.stringify({ csrf, returnTo })).toString("base64url");

  const cookieStore = await cookies();
  cookieStore.set("oauth-state", csrf, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set("client_id", clientId || "");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scopes);
  authUrl.searchParams.set("state", state);
  if (provider === "google") authUrl.searchParams.set("access_type", "offline");

  return NextResponse.redirect(authUrl.toString());
}
