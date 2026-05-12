/**
 * Minimal HTML sanitizer for customer-authored requirement descriptions.
 *
 * Customers can paste HTML (lists, formatting from word docs, etc.). Their
 * own data is rendered back to them AND to admins on the lead detail page,
 * which means stored XSS would let one customer attack our team. So we
 * strip <script>, event handlers (on*=...), javascript: URLs, and inline
 * style/data URIs that can carry exploits.
 *
 * This is intentionally tight rather than feature-complete — for richer
 * formatting we'll graduate to sanitize-html or DOMPurify later. The
 * current allowlist covers the formatting tags TipTap-style editors emit.
 */

const TAG_REGEX = /<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi;
const ALLOWED_TAGS = new Set([
  "p", "br", "b", "strong", "i", "em", "u", "s",
  "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "code", "pre",
  "a",
  "span", "div",
]);

export function sanitizeRequirementHtml(input: string | null | undefined): string {
  if (!input) return "";
  let html = String(input);

  // Drop <script> and <style> blocks entirely (greedy match of their content).
  html = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style\b[\s\S]*?<\/style>/gi, "");

  // Strip event handlers and javascript: URIs anywhere they appear.
  html = html.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  html = html.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  html = html.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  html = html.replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')/gi, "");
  html = html.replace(/(href|src)\s*=\s*("|')\s*data:[^"']*("|')/gi, "");

  // Walk tags and drop any not in the allowlist.
  html = html.replace(TAG_REGEX, (match, tag: string) => {
    return ALLOWED_TAGS.has(tag.toLowerCase()) ? match : "";
  });

  return html.trim();
}
