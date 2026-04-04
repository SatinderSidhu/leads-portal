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
  "email-flows": "Email Flows",
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
    // Skip UUID segments — show "Lead Detail" instead
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/.test(seg);
    const label = isUuid ? "Lead Detail" : ROUTE_LABELS[seg] || seg;
    crumbs.push({ label, href: path });
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
