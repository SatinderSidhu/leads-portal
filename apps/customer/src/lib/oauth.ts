export const OAUTH_PROVIDERS = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scopes: "openid email profile",
    clientId: () => process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET || "",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    userInfoUrl: "https://api.linkedin.com/v2/userinfo",
    scopes: "openid profile email",
    clientId: () => process.env.LINKEDIN_CLIENT_ID || "",
    clientSecret: () => process.env.LINKEDIN_CLIENT_SECRET || "",
  },
} as const;

export type OAuthProvider = keyof typeof OAUTH_PROVIDERS;

export function isValidProvider(provider: string): provider is OAuthProvider {
  return provider === "google" || provider === "linkedin";
}

export function getCallbackUrl(provider: string): string {
  const base = process.env.CUSTOMER_PORTAL_URL || "http://localhost:3001";
  return `${base}/api/auth/${provider}/callback`;
}

export function isValidReturnTo(returnTo: string | null | undefined): boolean {
  if (!returnTo) return false;
  // Must start with / and not // (prevent open redirect)
  return returnTo.startsWith("/") && !returnTo.startsWith("//");
}
