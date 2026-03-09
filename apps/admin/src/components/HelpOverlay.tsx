"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const helpContent: Record<string, { title: string; sections: { heading: string; text: string }[] }> = {
  "/dashboard": {
    title: "Dashboard",
    sections: [
      {
        heading: "Leads Overview",
        text: "The dashboard shows all your leads in a sortable grid. Each row displays the lead's name, email, project, status, stage, and source. Click any lead to view full details.",
      },
      {
        heading: "Search & Filter",
        text: "Use the search bar to quickly find leads by name, email, or project. Filter by status or stage using the dropdown filters above the grid.",
      },
      {
        heading: "Lead Stages",
        text: "Stages represent sales temperature: Cold (new/unresponsive), Warm (some engagement), Hot (high interest), Active (in progress), Closed (completed or lost).",
      },
      {
        heading: "Lead Statuses",
        text: "Statuses track project progress: New \u2192 Design Ready \u2192 Design Approved \u2192 Build In Progress \u2192 Build Ready for Review \u2192 Build Submitted \u2192 Go Live.",
      },
      {
        heading: "Quick Actions",
        text: "Use the '+ New Lead' button to capture a new lead. Click the 'My Profile' button to manage your profile picture and email signature.",
      },
    ],
  },
  "/leads/new": {
    title: "Create New Lead",
    sections: [
      {
        heading: "Required Fields",
        text: "Project name, customer name, and customer email are required. These are used for communication and tracking.",
      },
      {
        heading: "Lead Source",
        text: "Select how the lead was acquired: Manual (entered by team), Agent (from an agent/referral), or Bark (from Bark.com marketplace).",
      },
      {
        heading: "Welcome Email",
        text: "When creating a lead, a welcome email is automatically sent to the customer with a link to their project portal where they can track progress.",
      },
      {
        heading: "Additional Fields",
        text: "Phone, city, zip code, and LinkedIn/Facebook/Twitter URLs are optional but help with lead profiling and outreach.",
      },
    ],
  },
  "/leads/[id]": {
    title: "Lead Details",
    sections: [
      {
        heading: "Lead Information",
        text: "View and edit all lead details including contact info, project description, status, and stage. Changes are saved when you click 'Save Changes'.",
      },
      {
        heading: "Email Compose",
        text: "Send personalized emails directly from the lead page. Select a template to pre-fill, or compose from scratch. Use the code/visual toggle to switch between rich text and HTML editing.",
      },
      {
        heading: "Email Signature",
        text: "Check 'Include email signature' to append your predefined signature. Set up your signature in the Profile page.",
      },
      {
        heading: "Email Preview",
        text: "Click 'Preview Email' to see exactly how your email will appear in the recipient's inbox before sending.",
      },
      {
        heading: "Email Tracking",
        text: "All sent emails are tracked. A hidden pixel detects when the recipient opens the email. View sent email history with open/delivered status in the Email History section.",
      },
      {
        heading: "Notes & Activity",
        text: "Add internal notes visible only to the admin team. Notes are timestamped and show who added them.",
      },
      {
        heading: "File Attachments",
        text: "Upload files related to the lead (contracts, designs, documents). Files are stored securely and accessible from the lead detail page.",
      },
      {
        heading: "Status Changes",
        text: "Changing lead status creates an audit trail entry. The customer is notified via email when their project status changes.",
      },
    ],
  },
  "/leads/[id]/nda": {
    title: "NDA Management",
    sections: [
      {
        heading: "Generate NDA",
        text: "Generate a non-disclosure agreement for the lead. The NDA is pre-populated with project and customer details.",
      },
      {
        heading: "Send NDA",
        text: "Send the NDA to the customer via email. They'll receive a link to view and sign it on the customer portal.",
      },
      {
        heading: "Track Signing",
        text: "Monitor NDA status: Generated \u2192 Sent \u2192 Signed. When the customer signs, their name, IP address, and timestamp are recorded.",
      },
    ],
  },
  "/email-templates": {
    title: "Email Templates",
    sections: [
      {
        heading: "Template Library",
        text: "Create and manage reusable email templates. Templates save time when sending similar emails to multiple leads.",
      },
      {
        heading: "Template Purposes",
        text: "Categorize templates by purpose: Welcome, Follow-Up, Reminder, Notification, Promotional, or Other. This helps organize and find the right template quickly.",
      },
      {
        heading: "Placeholders",
        text: "Use {{customerName}} and {{projectName}} in templates. These are automatically replaced with the lead's actual data when composing an email.",
      },
      {
        heading: "Rich Text Editor",
        text: "Templates support full HTML formatting — bold, italic, links, images, lists, and more. Toggle between visual and code mode to fine-tune your templates.",
      },
    ],
  },
  "/email-flows": {
    title: "Email Flows",
    sections: [
      {
        heading: "Visual Flow Builder",
        text: "Design automated email sequences using a drag-and-drop interface. Connect nodes to create multi-step communication workflows.",
      },
      {
        heading: "Flow Nodes",
        text: "Add trigger nodes (e.g., lead created), action nodes (e.g., send email), delay nodes (e.g., wait 3 days), and condition nodes (e.g., if opened).",
      },
      {
        heading: "Managing Flows",
        text: "Save, edit, and organize your flows. Each flow has a name and description to help your team understand its purpose.",
      },
    ],
  },
  "/content": {
    title: "Content Management",
    sections: [
      {
        heading: "Social Media Content",
        text: "Create, schedule, and manage content posts for social media platforms: LinkedIn, Facebook, TikTok, and Instagram.",
      },
      {
        heading: "Media Uploads",
        text: "Attach images and media files to your content posts. Supported formats include JPEG, PNG, GIF, and WebP.",
      },
      {
        heading: "Content Status",
        text: "Track content through its lifecycle: Draft (in progress), Published (live), Archived (removed from active use).",
      },
      {
        heading: "Tags",
        text: "Add tags to organize and categorize your content. Tags make it easy to find related posts later.",
      },
    ],
  },
  "/admin-users": {
    title: "Admin Users",
    sections: [
      {
        heading: "User Management",
        text: "View all admin users with their status (active/inactive). Only active users can log in to the portal.",
      },
      {
        heading: "Creating Users",
        text: "Add new admin users with a name, email, username, and password. A welcome email is sent with their login credentials.",
      },
      {
        heading: "Editing Users",
        text: "Update user details, change passwords, or deactivate accounts. Deactivated users cannot log in but their data is preserved.",
      },
    ],
  },
  "/profile": {
    title: "My Profile",
    sections: [
      {
        heading: "Profile Picture",
        text: "Upload a profile picture (JPEG, PNG, GIF, or WebP, max 5MB). Your picture appears in the portal header.",
      },
      {
        heading: "Personal Information",
        text: "Update your name, email, and username. You can also change your password from this page.",
      },
      {
        heading: "Email Signature",
        text: "Create a rich text email signature that can be appended to outgoing emails. Use the visual editor to add formatting, links, and images to your signature.",
      },
    ],
  },
  "/api-docs": {
    title: "API Documentation",
    sections: [
      {
        heading: "External API",
        text: "The Leads Portal provides a REST API (v1) for external integrations. All endpoints require Bearer token authentication using your API_TOKEN.",
      },
      {
        heading: "Available Endpoints",
        text: "GET /api/v1/leads — List all leads. GET/POST /api/v1/content — Manage content. POST /api/v1/content/upload — Upload media files.",
      },
      {
        heading: "Swagger UI",
        text: "This page shows the interactive Swagger documentation. You can test API calls directly from the browser by providing your API token.",
      },
    ],
  },
};

function getHelpForPath(pathname: string) {
  // Direct match
  if (helpContent[pathname]) return helpContent[pathname];

  // Match dynamic routes like /leads/abc123 → /leads/[id]
  if (/^\/leads\/[^/]+\/nda$/.test(pathname)) return helpContent["/leads/[id]/nda"];
  if (/^\/leads\/[^/]+$/.test(pathname)) return helpContent["/leads/[id]"];
  if (/^\/email-templates\/(new|[^/]+)$/.test(pathname)) return helpContent["/email-templates"];
  if (/^\/email-flows\/(new|[^/]+)$/.test(pathname)) return helpContent["/email-flows"];
  if (/^\/content\/(new|[^/]+)$/.test(pathname)) return helpContent["/content"];
  if (/^\/admin-users\/(new|[^/]+)$/.test(pathname)) return helpContent["/admin-users"];

  return null;
}

export function HelpButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const help = getHelpForPath(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!help) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        title="Help"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm font-medium">Help Guide</p>
                  <h2 className="text-xl font-bold mt-1">{help.title}</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 hover:bg-blue-700 rounded-lg transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {help.sections.map((section, i) => (
                <div key={i}>
                  <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
                    {section.heading}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                    {section.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
