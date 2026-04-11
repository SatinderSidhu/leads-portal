import { prisma } from "@leads-portal/database";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionCookie } from "../../../../../lib/session";

const PROVIDER_CONFIGS: Record<string, { tokenUrl: string; userInfoUrl: string }> = {
  google: {
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
  },
  linkedin: {
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    userInfoUrl: "https://api.linkedin.com/v2/userinfo",
  },
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const config = PROVIDER_CONFIGS[provider];
  if (!config) return NextResponse.redirect(new URL("/login?error=unknown_provider", req.url));

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.APP_FACTORY_URL || process.env.CUSTOMER_PORTAL_URL || "http://localhost:3002";

  if (error) return NextResponse.redirect(`${baseUrl}/login?error=oauth_denied`);
  if (!code || !stateParam) return NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`);

  // Validate CSRF
  const cookieStore = await cookies();
  const storedCsrf = cookieStore.get("oauth-state")?.value;
  let returnTo = "/start";
  try {
    const state = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    if (state.csrf !== storedCsrf) return NextResponse.redirect(`${baseUrl}/login?error=csrf_mismatch`);
    if (state.returnTo && /^\/[^/].*/.test(state.returnTo)) returnTo = state.returnTo;
  } catch {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_state`);
  }
  cookieStore.delete("oauth-state");

  // Exchange code for token
  const clientId = provider === "google" ? process.env.GOOGLE_CLIENT_ID : process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = provider === "google" ? process.env.GOOGLE_CLIENT_SECRET : process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/auth/${provider}/callback`;

  const tokenRes = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId || "",
      client_secret: clientSecret || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(`${baseUrl}/login?error=token_exchange_failed`);
  const tokenData = await tokenRes.json();

  // Get user info
  const userRes = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) return NextResponse.redirect(`${baseUrl}/login?error=userinfo_failed`);
  const profile = await userRes.json();

  const email = (profile.email || "").toLowerCase();
  const name = profile.name || profile.given_name || email.split("@")[0];
  const providerId = provider === "google" ? profile.id : profile.sub;
  const avatarUrl = profile.picture || null;

  if (!email) return NextResponse.redirect(`${baseUrl}/login?error=oauth_no_email`);

  // Find or create user
  let userId: string;

  // 1. Check existing social account
  const existingSocial = await prisma.socialAccount.findUnique({
    where: { provider_providerId: { provider: provider.toUpperCase() as "GOOGLE" | "LINKEDIN", providerId } },
    select: { userId: true },
  });

  if (existingSocial) {
    userId = existingSocial.userId;
  } else {
    // 2. Check existing user by email
    const existingUser = await prisma.customerUser.findUnique({ where: { email } });

    if (existingUser) {
      // Link social account to existing user
      await prisma.socialAccount.create({
        data: {
          provider: provider.toUpperCase() as "GOOGLE" | "LINKEDIN",
          providerId,
          userId: existingUser.id,
          email,
          name,
          avatarUrl,
        },
      });
      userId = existingUser.id;
    } else {
      // 3. Create new user + social account
      const newUser = await prisma.customerUser.create({
        data: {
          email,
          name,
          socialAccounts: {
            create: {
              provider: provider.toUpperCase() as "GOOGLE" | "LINKEDIN",
              providerId,
              email,
              name,
              avatarUrl,
            },
          },
        },
      });
      userId = newUser.id;
    }
  }

  // Set session
  const session = createSessionCookie(userId);
  cookieStore.set(session.name, session.value, session.options);

  return NextResponse.redirect(`${baseUrl}${returnTo}`);
}
