"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  NEW: "New", SOW_READY: "SOW Ready", SOW_SIGNED: "SOW Signed", APP_FLOW_READY: "App Flow Ready",
  DESIGN_READY: "Design Ready", DESIGN_APPROVED: "Design Approved", BUILD_IN_PROGRESS: "Build In Progress",
  BUILD_READY_FOR_REVIEW: "Build Ready for Review", BUILD_SUBMITTED: "Build Submitted", GO_LIVE: "Go Live",
  LOST: "Lost", NO_RESPONSE: "No Response", ON_HOLD: "On Hold", CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800", SOW_READY: "bg-cyan-100 text-cyan-800", SOW_SIGNED: "bg-cyan-100 text-cyan-800",
  APP_FLOW_READY: "bg-teal-100 text-teal-800", DESIGN_READY: "bg-yellow-100 text-yellow-800",
  DESIGN_APPROVED: "bg-green-100 text-green-800", BUILD_IN_PROGRESS: "bg-orange-100 text-orange-800",
  BUILD_READY_FOR_REVIEW: "bg-purple-100 text-purple-800", BUILD_SUBMITTED: "bg-indigo-100 text-indigo-800",
  GO_LIVE: "bg-emerald-100 text-emerald-800", LOST: "bg-red-100 text-red-800", NO_RESPONSE: "bg-gray-100 text-gray-800",
  ON_HOLD: "bg-amber-100 text-amber-800", CANCELLED: "bg-red-100 text-red-800",
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  received_email: { label: "Email Received", color: "bg-blue-100 text-blue-800", icon: "↓" },
  sent_email: { label: "Email Sent", color: "bg-green-100 text-green-800", icon: "↑" },
  status_change: { label: "Status Changed", color: "bg-amber-100 text-amber-800", icon: "→" },
  note: { label: "Note Added", color: "bg-purple-100 text-purple-800", icon: "✎" },
  email_opened: { label: "Email Opened", color: "bg-cyan-100 text-cyan-800", icon: "👁" },
  portal_visit: { label: "Portal Visit", color: "bg-teal-100 text-teal-800", icon: "🌐" },
};

interface DashboardStats {
  totalLeads: number;
  myLeads: number;
  newLeadsToday: number;
  newLeadsThisWeek: number;
  activeLeads: number;
  closedLeads: number;
  recentEmailOpens: number;
  recentPortalVisits: number;
  recentCustomerComments: number;
  recentReceivedEmails: number;
  needsAttentionCount: number;
  myPendingTasksCount: number;
  unreadMessages: number;
}

interface AttentionLead {
  leadId: string;
  projectName: string;
  customerName: string;
  status: string;
  assignedTo: string | null;
  lastAction: string;
  lastDetail: string | null;
  lastActor: string | null;
  lastActivityAt: string;
  activityCount: number;
}

interface MyTask {
  id: string;
  content: string;
  dueDate: string | null;
  createdBy: string | null;
  createdAt: string;
  leadId: string;
  projectName: string;
  customerName: string;
  leadStatus: string;
}

interface ActivityItem {
  id: string;
  type: string;
  timestamp: string;
  lead: { id: string; projectName: string; customerName: string };
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [needsAttention, setNeedsAttention] = useState<AttentionLead[]>([]);
  const [myTasks, setMyTasks] = useState<MyTask[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<Record<string, number>>({});
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) { if (res.status === 401) router.push("/login"); return null; }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setAdminName(data.admin?.name || "");
          setStats(data.stats);
          setNeedsAttention(data.needsAttention || []);
          setMyTasks(data.myTasks || []);
          setStatusDistribution(data.statusDistribution || {});
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    fetch("/api/activity?limit=15")
      .then((res) => res.ok ? res.json() : { activities: [] })
      .then((data) => setActivities(data.activities || []))
      .finally(() => setActivityLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01358d]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {getGreeting()}, {adminName}!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Here&apos;s what&apos;s happening with your leads today.
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <StatCard label="Total Leads" value={stats.totalLeads} color="text-gray-900 dark:text-white" onClick={() => router.push("/dashboard?assignedTo=all")} />
          <StatCard label="My Leads" value={stats.myLeads} color="text-[#01358d]" onClick={() => router.push("/dashboard")} />
          <StatCard label="New Today" value={stats.newLeadsToday} color="text-green-600" highlight={stats.newLeadsToday > 0} />
          <StatCard label="This Week" value={stats.newLeadsThisWeek} color="text-blue-600" />
          <StatCard label="Active Pipeline" value={stats.activeLeads} color="text-amber-600" />
          <StatCard label="My Tasks" value={stats.myPendingTasksCount} color="text-purple-600" highlight={stats.myPendingTasksCount > 0} />
          <StatCard label="Unread Chats" value={stats.unreadMessages || 0} color="text-pink-600" highlight={(stats.unreadMessages || 0) > 0} onClick={() => router.push("/messages")} />
          <StatCard label="Needs Attention" value={stats.needsAttentionCount} color="text-red-600" highlight={stats.needsAttentionCount > 0} />
        </div>
      )}

      {/* Customer Engagement Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-cyan-500">👁</span>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Emails Opened (24h)</p>
            </div>
            <p className="text-xl font-bold text-cyan-600">{stats.recentEmailOpens}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-teal-500">🌐</span>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Portal Visits (24h)</p>
            </div>
            <p className="text-xl font-bold text-teal-600">{stats.recentPortalVisits}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-purple-500">💬</span>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Comments (24h)</p>
            </div>
            <p className="text-xl font-bold text-purple-600">{stats.recentCustomerComments}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-blue-500">↓</span>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Replies (24h)</p>
            </div>
            <p className="text-xl font-bold text-blue-600">{stats.recentReceivedEmails}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* My Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Tasks</h2>
            <span className="text-xs text-gray-400">{myTasks.length} pending</span>
          </div>
          {myTasks.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">No pending tasks assigned to you.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {myTasks.map((task) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                return (
                  <div
                    key={task.id}
                    onClick={() => router.push(`/leads/${task.leadId}`)}
                    className={`p-3 rounded-lg border cursor-pointer transition hover:shadow-sm ${
                      isOverdue
                        ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{task.content}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-blue-600 font-medium">{task.projectName}</span>
                      <span className="text-xs text-gray-400">{task.customerName}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {task.dueDate && (
                        <span className={`text-xs ${isOverdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.createdBy && (
                        <span className="text-xs text-gray-400">by {task.createdBy}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Needs Attention */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Needs Attention</h2>
            <span className="text-xs text-gray-400">Last 7 days</span>
          </div>
          {needsAttention.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">No leads need attention right now.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {needsAttention.map((lead) => (
                <div
                  key={lead.leadId}
                  onClick={() => router.push(`/leads/${lead.leadId}`)}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-xs font-bold">
                    {lead.activityCount}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{lead.projectName}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-800"}`}>
                        {STATUS_LABELS[lead.status] || lead.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{lead.customerName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {lead.lastAction}{lead.lastActor ? ` by ${lead.lastActor}` : ""} — {timeAgo(lead.lastActivityAt)}
                    </p>
                  </div>
                  {lead.assignedTo && (
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{lead.assignedTo}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pipeline Overview</h2>
          {Object.keys(statusDistribution).length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">No leads in the pipeline yet.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(statusDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => {
                  const total = Object.values(statusDistribution).reduce((s, c) => s + c, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-32 text-center ${STATUS_COLORS[status] || "bg-gray-100 text-gray-800"}`}>
                        {STATUS_LABELS[status] || status}
                      </span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-[#01358d] h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          <button
            onClick={() => router.push("/activity")}
            className="text-xs text-[#01358d] dark:text-blue-400 hover:underline font-medium"
          >
            View All Activity
          </button>
        </div>
        {activityLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#01358d]" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {activities.map((item) => {
              const config = TYPE_CONFIG[item.type] || { label: item.type, color: "bg-gray-100 text-gray-800", icon: "•" };
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => router.push(`/leads/${item.lead.id}`)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition"
                >
                  <span className="text-sm flex-shrink-0">{config.icon}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                    <span className="font-medium text-blue-600">{item.lead.projectName}</span>
                    <span className="text-gray-400"> — {item.lead.customerName}</span>
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(item.timestamp)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, highlight, onClick }: {
  label: string; value: number; color: string; highlight?: boolean; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition ${
        highlight ? "border-red-200 dark:border-red-800 ring-1 ring-red-100 dark:ring-red-900" : "border-gray-200 dark:border-gray-700"
      } ${onClick ? "cursor-pointer hover:shadow-md" : ""}`}
    >
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
