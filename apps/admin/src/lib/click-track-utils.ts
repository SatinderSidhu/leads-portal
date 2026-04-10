/**
 * Rewrites all <a href="..."> links in HTML to go through the click tracking endpoint.
 * Skips links with data-no-track attribute (e.g., unsubscribe links).
 * Skips already-rewritten links (idempotent).
 */
export function rewriteLinksForTracking(
  html: string,
  sentEmailId: string,
  baseUrl: string
): string {
  if (!html || !sentEmailId) return html;

  const trackPrefix = `${baseUrl}/api/track-click/${sentEmailId}`;

  // Match <a ... href="..." ...> tags, capturing the full tag and href value
  // Skip tags with data-no-track attribute
  return html.replace(
    /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (fullMatch, beforeHref, url, afterHref) => {
      // Skip if already rewritten
      if (url.includes("/api/track-click/")) return fullMatch;

      // Skip if data-no-track is present
      const attrs = beforeHref + afterHref;
      if (attrs.includes("data-no-track")) return fullMatch;

      // Skip mailto: and tel: links
      if (url.startsWith("mailto:") || url.startsWith("tel:")) return fullMatch;

      // Skip anchor links
      if (url.startsWith("#")) return fullMatch;

      // Encode the URL as base64url for safe transport in query params
      const encoded = Buffer.from(url).toString("base64url");
      const trackUrl = `${trackPrefix}?url=${encoded}`;

      return `<a ${beforeHref}href="${trackUrl}"${afterHref}>`;
    }
  );
}
