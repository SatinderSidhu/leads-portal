import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@leads-portal/database";
import {
  OAUTH_PROVIDERS,
  isValidProvider,
  getCallbackUrl,
  isValidReturnTo,
} from "../../../../../lib/oauth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const baseUrl = process.env.CUSTOMER_PORTAL_URL || "http://localhost:3001";

  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_denied", baseUrl)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_missing_params", baseUrl)
    );
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const storedCsrf = cookieStore.get("oauth-state")?.value;
  cookieStore.delete("oauth-state");

  let stateData: { csrf: string; returnTo: string };
  try {
    stateData = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8")
    );
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=oauth_invalid_state", baseUrl)
    );
  }

  if (!storedCsrf || stateData.csrf !== storedCsrf) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_csrf_mismatch", baseUrl)
    );
  }

  const config = OAUTH_PROVIDERS[provider];
  const clientId = config.clientId();
  const clientSecret = config.clientSecret();

  // Exchange code for tokens
  const tokenRes = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getCallbackUrl(provider),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_token_failed", baseUrl)
    );
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Fetch user profile
  const profileRes = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_profile_failed", baseUrl)
    );
  }

  const profile = await profileRes.json();

  // Normalize profile data across providers
  const providerId =
    provider === "google" ? profile.id : profile.sub;
  const profileEmail: string | null =
    profile.email?.toLowerCase() || null;
  const profileName: string =
    profile.name || profile.given_name || profileEmail || "User";
  const avatarUrl: string | null =
    profile.picture || null;

  if (!providerId || !profileEmail) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_no_email", baseUrl)
    );
  }

  // Find or create user (with account linking)
  const providerEnum = provider === "google" ? "GOOGLE" : "LINKEDIN";

  // 1. Check if social account already exists
  let socialAccount = await prisma.socialAccount.findUnique({
    where: {
      provider_providerId: {
        provider: providerEnum,
        providerId,
      },
    },
    include: { user: true },
  });

  let user;

  if (socialAccount) {
    // Existing social login — use linked user
    user = socialAccount.user;
  } else {
    // 2. Check if a CustomerUser with this email exists
    user = await prisma.customerUser.findUnique({
      where: { email: profileEmail },
    });

    if (user) {
      // Link social account to existing user
      await prisma.socialAccount.create({
        data: {
          provider: providerEnum,
          providerId,
          userId: user.id,
          email: profileEmail,
          name: profileName,
          avatarUrl,
        },
      });
    } else {
      // 3. Create new user + social account
      // Auto-link leads by email (same logic as register)
      const matchingLeads = await prisma.lead.findMany({
        where: {
          customerEmail: { equals: profileEmail, mode: "insensitive" },
        },
        select: { id: true },
      });
      const leadIds = matchingLeads.map((l) => l.id);

      user = await prisma.customerUser.create({
        data: {
          email: profileEmail,
          name: profileName,
          password: null,
          leadIds,
          socialAccounts: {
            create: {
              provider: providerEnum,
              providerId,
              email: profileEmail,
              name: profileName,
              avatarUrl,
            },
          },
        },
      });
    }
  }

  // Set session cookie
  const sessionValue = `${user.id}:${process.env.SESSION_SECRET}`;
  cookieStore.set("customer-session", sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  // Redirect to returnTo or home
  const returnTo = isValidReturnTo(stateData.returnTo)
    ? stateData.returnTo
    : "/";

  return NextResponse.redirect(new URL(returnTo, baseUrl));
}
