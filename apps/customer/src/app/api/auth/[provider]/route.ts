import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  OAUTH_PROVIDERS,
  isValidProvider,
  getCallbackUrl,
  isValidReturnTo,
} from "../../../../lib/oauth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const config = OAUTH_PROVIDERS[provider];
  const clientId = config.clientId();

  if (!clientId) {
    return NextResponse.json(
      { error: `${provider} login is not configured` },
      { status: 501 }
    );
  }

  // Get returnTo from query string
  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get("returnTo");

  // Generate CSRF state
  const csrfToken = crypto.randomUUID();
  const state = Buffer.from(
    JSON.stringify({
      csrf: csrfToken,
      returnTo: isValidReturnTo(returnTo) ? returnTo : "/",
    })
  ).toString("base64url");

  // Store CSRF token in cookie
  const cookieStore = await cookies();
  cookieStore.set("oauth-state", csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  // Build OAuth authorization URL
  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", getCallbackUrl(provider));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scopes);
  authUrl.searchParams.set("state", state);

  if (provider === "google") {
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "select_account");
  }

  return NextResponse.redirect(authUrl.toString());
}
