"use client";

import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  "": "Dashboard",
  dashboard: "Leads",
  activity: "Activity Feed",
  portfolio: "Portfolio",
  "naics-codes": "NAICS Codes",
  knowledge: "Knowledge Base",
  services: "Services",
  projects: "Projects",
  leads: "Leads",
  new: "New Lead",
  "sow-builder": "SOW Builder",
  "app-flow-builder": "App Flow Builder",
  nda: "NDA",
  "email-templates": "Email Templates",
  "sow-templates": "SOW Templates",
  content: "Content",
  branding: "Branding",
  "zoho-settings": "Zoho CRM",
  unlinked: "Find Unlinked",
  import: "Import from Zoho",
  export: "Export to Zoho",
  "notification-settings": "Communications",
  messages: "Live Chat",
  "admin-users": "Admin Users",
  profile: "My Profile",
  "api-docs": "API Docs",
};

// Routes that don't have their own page — redirect to a valid parent
const ROUTE_REDIRECTS: Record<string, string> = {
  "/leads": "/dashboard",
  "/portfolio/services": "/portfolio",
  "/portfolio/projects": "/portfolio",
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        <span className="font-medium text-gray-900 dark:text-white">Dashboard</span>
      </div>
    );
  }

  const crumbs: { label: string; href: string }[] = [];
  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    // Skip UUID segments — show contextual label instead
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/.test(seg);
    let label = isUuid ? "Detail" : ROUTE_LABELS[seg] || seg;
    // Contextual detail labels based on parent
    if (isUuid && segments[0] === "leads") label = "Lead Detail";
    if (isUuid && segments[0] === "portfolio" && segments[1] === "projects") label = "Project Detail";
    if (isUuid && segments[0] === "portfolio" && segments[1] === "services") label = "Service Detail";
    if (isUuid && segments[0] === "email-templates") label = "Edit Template";
    if (isUuid && segments[0] === "sow-templates") label = "Edit Template";
    if (isUuid && segments[0] === "admin-users") label = "Edit User";
    const href = ROUTE_REDIRECTS[path] || path;
    crumbs.push({ label, href });
  }

  return (
    <div className="flex items-center gap-1.5 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-300 dark:text-gray-600">/</span>}
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-gray-900 dark:text-white">{crumb.label}</span>
          ) : (
            <a href={crumb.href} className="text-gray-500 dark:text-gray-400 hover:text-[#01358d] dark:hover:text-blue-400 transition">
              {crumb.label}
            </a>
          )}
        </span>
      ))}
    </div>
  );
}
