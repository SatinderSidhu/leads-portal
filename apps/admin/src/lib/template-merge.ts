/**
 * Shared merge-tag replacement for email templates.
 * Used by both the sequence processor and (eventually) the lead compose route.
 */

export interface MergeContext {
  /** The Lead id — used to construct {{customerPortalUrl}} on demand if
   *  the caller doesn't pre-compute it. */
  id?: string;
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
  /** Override the customer-portal URL. If omitted, the helper builds it
   *  from `process.env.CUSTOMER_PORTAL_URL + ?id=<id>`. */
  customerPortalUrl?: string;
}

export function mergeTags(text: string, ctx: MergeContext): string {
  if (!text) return text;

  const formattedDate = ctx.dateCreated
    ? new Date(ctx.dateCreated).toLocaleDateString()
    : "";

  // Build the customer-portal URL once. Callers can override by passing
  // ctx.customerPortalUrl directly; otherwise we derive it from the env
  // var + ?id query so the customer's visit-tracking pixel still fires.
  let customerPortalUrl = ctx.customerPortalUrl || "";
  if (!customerPortalUrl && ctx.id) {
    const base = process.env.CUSTOMER_PORTAL_URL || "https://leadsportal.kitlabs.us";
    customerPortalUrl = `${base}?id=${ctx.id}`;
  }

  // first_name: best-effort split on the customerName so casual greetings
  // ("Hi Sarah,") render correctly. Templates were written using {{first_name}}
  // before the renderer learned the tag — covering both spellings keeps the
  // 44 templates already in the DB working without rewrites.
  const firstName = (ctx.customerName || "").trim().split(/\s+/)[0] || "";

  const replacements: Record<string, string> = {
    customerName: ctx.customerName || "",
    first_name: firstName,
    firstName,
    projectName: ctx.projectName || "",
    phone: ctx.phone || "",
    city: ctx.city || "",
    status: ctx.status || "",
    stage: ctx.stage || "",
    source: ctx.source || "",
    dateCreated: formattedDate,
    companyName: ctx.companyName || "",
    // company_name is a snake_case alias used by ~32 templates in the DB.
    company_name: ctx.companyName || "",
    jobTitle: ctx.jobTitle || "",
    customerPortalUrl,
  };

  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}
