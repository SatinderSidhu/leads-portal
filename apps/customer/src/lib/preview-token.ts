import { createHmac } from "crypto";

const SECRET = process.env.SESSION_SECRET || "fallback-secret";

export function generatePreviewToken(leadId: string): string {
  return createHmac("sha256", SECRET).update(`preview:${leadId}`).digest("hex").slice(0, 32);
}

export function isValidPreviewToken(leadId: string, token: string): boolean {
  const expected = generatePreviewToken(leadId);
  return token === expected;
}
