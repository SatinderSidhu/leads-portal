"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../components/ThemeToggle";

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  SOW_READY: "SOW Ready",
  DESIGN_READY: "Design Ready",
  DESIGN_APPROVED: "Design Approved",
  BUILD_IN_PROGRESS: "Build In Progress",
  BUILD_READY_FOR_REVIEW: "Build Ready for Review",
  BUILD_SUBMITTED: "Build Submitted",
  GO_LIVE: "Go Live",
};

interface ActivityLead {
  id: string;
  projectName: string;
  customerName: string;
  customerEmail: string;
}

interface ActivityItem {
  id: string;
  type: "received_email" | "sent_email" | "status_change" | "note";
  timestamp: string;
  lead: ActivityLead;
  data: Record<string, string | null>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  received_email: { label: "Email Received", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: "↓" },
  sent_email: { label: "Email Sent", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: "↑" },
  status_change: { label: "Status Changed", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", icon: "→" },
  note: { label: "Note Added", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", icon: "✎" },
};

export default function ActivityDashboard() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/activity?limit=50")
      .then((res) => {
        if (!res.ok) {
          if (res.redirected || res.status === 401) router.push("/login");
          return [];
        }
        return res.json();
      })
      .then(setActivities)
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  const filtered = filter === "all" ? activities : activities.filter((a) => a.type === filter);

  // Count unread (received emails in last 24h)
  const recentReceivedCount = activities.filter(
    (a) => a.type === "received_email" && Date.now() - new Date(a.timestamp).getTime() < 86400000
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Leads Portal</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <ThemeToggle />
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              All Leads
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              My Profile
            </button>
            <button
              onClick={() => router.push("/admin-users")}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Admin Users
            </button>
            <button
              onClick={() => router.push("/email-templates")}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition"
            >
              Email Templates
            </button>
            <button
              onClick={() => router.push("/email-flows")}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition"
            >
              Email Flows
            </button>
            <button
              onClick={() => router.push("/content")}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition"
            >
              Content
            </button>
            <button
              onClick={() => router.push("/leads/new")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              + New Lead
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Activity</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{activities.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Emails Received (24h)</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{recentReceivedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Emails Sent</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{activities.filter((a) => a.type === "sent_email").length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status Changes</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{activities.filter((a) => a.type === "status_change").length}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {[
            { key: "all", label: "All Activity" },
            { key: "received_email", label: "Received Emails" },
            { key: "sent_email", label: "Sent Emails" },
            { key: "status_change", label: "Status Changes" },
            { key: "note", label: "Notes" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
              {tab.key === "received_email" && recentReceivedCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{recentReceivedCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Activity feed */}
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading activity...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const config = TYPE_CONFIG[item.type];
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => router.push(`/leads/${item.lead.id}`)}
                  className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-lg mt-0.5 flex-shrink-0">{config.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-sm font-medium text-blue-600 truncate">
                            {item.lead.projectName}
                          </span>
                          <span className="text-xs text-gray-400">
                            {item.lead.customerName}
                          </span>
                        </div>

                        {/* Activity-specific details */}
                        <div className="mt-1.5">
                          {item.type === "received_email" && (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-medium">{item.data.fromName || item.data.fromEmail}</span>
                              {" — "}{item.data.subject}
                            </p>
                          )}
                          {item.type === "sent_email" && (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              Sent by <span className="font-medium">{item.data.sentBy}</span>
                              {" — "}{item.data.subject}
                              {item.data.status === "FAILED" && (
                                <span className="ml-2 text-red-500 text-xs font-medium">FAILED</span>
                              )}
                            </p>
                          )}
                          {item.type === "status_change" && (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {item.data.changedBy && <span className="font-medium">{item.data.changedBy}</span>}
                              {" changed status "}
                              {item.data.fromStatus && (
                                <><span className="font-medium">{STATUS_LABELS[item.data.fromStatus] || item.data.fromStatus}</span>{" → "}</>
                              )}
                              <span className="font-medium">{STATUS_LABELS[item.data.toStatus!] || item.data.toStatus}</span>
                            </p>
                          )}
                          {item.type === "note" && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                              {item.data.createdBy && <span className="font-medium">{item.data.createdBy}: </span>}
                              {(item.data.content || "").replace(/<[^>]*>/g, "").slice(0, 200)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-1">
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
