import crypto from "crypto";

/**
 * AES-256-GCM at-rest encryption for sensitive secrets (App Store credentials, etc.).
 *
 * Format: `v1:{iv-base64}.{tag-base64}.{ciphertext-base64}`
 * - `v1:` prefix lets us detect encrypted-vs-plaintext (for backward compat with rows
 *   stored before this was wired up) and lets us bump the format later.
 * - Random 12-byte IV per call → identical plaintexts produce different ciphertexts.
 * - GCM auth tag prevents undetected tampering.
 *
 * Key source: `APP_FACTORY_SECRET_KEY` env var, base64-encoded 32 bytes.
 *   Generate with: `openssl rand -base64 32`
 */

const ALG = "aes-256-gcm";
const VERSION = "v1";

function getKey(): Buffer {
  const raw = process.env.APP_FACTORY_SECRET_KEY;
  if (!raw) {
    throw new Error(
      "APP_FACTORY_SECRET_KEY env var is not set. Generate one with `openssl rand -base64 32` " +
        "and add it to GitHub Secrets + EC2 .env (and apps/app-factory/.env.local for dev)."
    );
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `APP_FACTORY_SECRET_KEY must decode to 32 bytes, got ${buf.length}. ` +
        "Generate one with `openssl rand -base64 32`."
    );
  }
  return buf;
}

export function encryptSecret(plain: string): string {
  if (!plain) throw new Error("Cannot encrypt empty value");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

export function decryptSecret(blob: string): string {
  if (!isEncrypted(blob)) {
    // Legacy plaintext row written before encryption was enabled — return as-is.
    // Will be re-saved encrypted on the next write.
    return blob;
  }
  const colonIdx = blob.indexOf(":");
  const payload = blob.slice(colonIdx + 1);
  const parts = payload.split(".");
  if (parts.length !== 3) throw new Error("Malformed encrypted blob");
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = crypto.createDecipheriv(ALG, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export function isEncrypted(blob: string | null | undefined): boolean {
  return !!blob && blob.startsWith(`${VERSION}:`);
}
