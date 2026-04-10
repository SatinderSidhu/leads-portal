/**
 * Shared merge-tag replacement for email templates.
 * Used by both the sequence processor and (eventually) the lead compose route.
 */

export interface MergeContext {
  customerName: string;
  projectName: string;
  phone?: string | null;
  city?: string | null;
  status?: string | null;
  stage?: string | null;
  source?: string | null;
  dateCreated?: Date | string | null;
  companyName?: string | null;
  jobTitle?: string | null;
}

export function mergeTags(text: string, ctx: MergeContext): string {
  if (!text) return text;

  const formattedDate = ctx.dateCreated
    ? new Date(ctx.dateCreated).toLocaleDateString()
    : "";

  const replacements: Record<string, string> = {
    customerName: ctx.customerName || "",
    projectName: ctx.projectName || "",
    phone: ctx.phone || "",
    city: ctx.city || "",
    status: ctx.status || "",
    stage: ctx.stage || "",
    source: ctx.source || "",
    dateCreated: formattedDate,
    companyName: ctx.companyName || "",
    jobTitle: ctx.jobTitle || "",
  };

  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}
