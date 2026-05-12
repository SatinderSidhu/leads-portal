import { prisma } from "@leads-portal/database";

/**
 * Returns the comma-joined email list of all secondary contacts for a lead,
 * or null if there are none. Suitable for direct use as a `cc` value in
 * nodemailer's `transporter.sendMail`.
 *
 * This is the single source of truth for "who else on the customer side
 * gets CC'd" — every customer-facing email helper calls it before sending.
 */
export async function getLeadCcEmails(leadId: string): Promise<string | null> {
  const contacts = await prisma.leadContact.findMany({
    where: { leadId },
    select: { email: true },
  });
  const emails = contacts.map((c) => c.email).filter(Boolean);
  return emails.length ? emails.join(",") : null;
}

/** Same, but returns the array — useful when callers need to merge with
 * admin-typed CCs (e.g. the manual email compose form) before joining. */
export async function getLeadCcEmailList(leadId: string): Promise<string[]> {
  const contacts = await prisma.leadContact.findMany({
    where: { leadId },
    select: { email: true },
  });
  return contacts.map((c) => c.email).filter(Boolean);
}

/** Combine an admin-typed CC string with the lead's secondary contacts.
 * De-duplicates case-insensitively and returns a single comma-joined
 * string or null. */
export function mergeCc(adminCc: string | null | undefined, autoCc: string[]): string | null {
  const fromAdmin = (adminCc || "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = new Map<string, string>();
  for (const e of [...fromAdmin, ...autoCc]) {
    merged.set(e.toLowerCase(), e);
  }
  if (merged.size === 0) return null;
  return Array.from(merged.values()).join(",");
}
