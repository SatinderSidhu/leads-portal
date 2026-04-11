"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  build_update: { icon: "🔨", color: "bg-orange-50 border-orange-200" },
  build_delivered: { icon: "🎉", color: "bg-green-50 border-green-200" },
  enhancement_update: { icon: "✨", color: "bg-purple-50 border-purple-200" },
  review_ready: { icon: "👀", color: "bg-blue-50 border-blue-200" },
  welcome: { icon: "👋", color: "bg-teal-50 border-teal-200" },
  info: { icon: "ℹ️", color: "bg-gray-50 border-gray-200" },
};

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export default function InboxPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "unread">("all");

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => {
        if (r.status === 401) { router.push("/login?returnTo=/inbox"); return null; }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setNotifications(d.notifications || []);
          setUnreadCount(d.unreadCount || 0);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function markAsRead(ids: string[]) {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: ids }),
    });
    setNotifications((prev) => prev.map((n) =>
      ids.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n
    ));
    setUnreadCount((c) => Math.max(0, c - ids.length));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    setUnreadCount(0);
  }

  function handleClick(notification: Notification) {
    if (!notification.readAt) markAsRead([notification.id]);
    if (notification.link) router.push(notification.link);
  }

  const filtered = tab === "unread" ? notifications.filter((n) => !n.readAt) : notifications;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-[#01358d] font-medium hover:underline transition">
            Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        <button onClick={() => setTab("all")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
          All
        </button>
        <button onClick={() => setTab("unread")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "unread" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
          Unread {unreadCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white">{unreadCount}</span>}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <div className="text-4xl mb-3">{tab === "unread" ? "✅" : "📭"}</div>
          <p className="text-gray-400 text-sm">
            {tab === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-xs text-gray-300 mt-1">
            We&apos;ll notify you when there are updates on your projects.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            const isUnread = !n.readAt;

            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`p-4 rounded-xl border transition cursor-pointer ${config.color} ${
                  isUnread ? "shadow-sm" : "opacity-75"
                } hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${isUnread ? "text-gray-900" : "text-gray-600"}`}>
                        {n.title}
                      </h3>
                      {isUnread && <span className="w-2 h-2 rounded-full bg-[#01358d] shrink-0" />}
                    </div>
                    <p className={`text-xs mt-0.5 ${isUnread ? "text-gray-600" : "text-gray-400"}`}>{n.body}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-gray-400">{formatTimeAgo(n.createdAt)}</span>
                      {n.link && <span className="text-[10px] text-[#01358d] font-medium">View details →</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
