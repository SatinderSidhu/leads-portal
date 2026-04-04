"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Conversation {
  leadId: string;
  projectName: string;
  customerName: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderType: string;
  unreadCount: number;
  totalMessages: number;
}

interface Message {
  id: string;
  content: string;
  senderName: string;
  senderType: string;
  createdAt: string;
  lead: { id: string; projectName: string; customerName: string };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"unread" | "all">("unread");

  const fetchData = useCallback(async () => {
    const [convRes, unreadRes] = await Promise.all([
      fetch("/api/messages").then((r) => r.json()),
      fetch("/api/messages?unread=1").then((r) => r.json()),
    ]);
    setConversations(convRes.conversations || []);
    setUnreadMessages(unreadRes.messages || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalUnread = unreadMessages.length;

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01358d]" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Live Chat Messages</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalUnread > 0 ? `${totalUnread} unread message${totalUnread !== 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("unread")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === "unread" ? "bg-[#01358d] text-white" : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"}`}>
          Unread {totalUnread > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{totalUnread}</span>}
        </button>
        <button onClick={() => setTab("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === "all" ? "bg-[#01358d] text-white" : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"}`}>
          All Conversations ({conversations.length})
        </button>
      </div>

      {/* Unread Messages */}
      {tab === "unread" && (
        <div className="space-y-2">
          {unreadMessages.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
              <p className="text-gray-400 text-sm">No unread messages</p>
            </div>
          ) : unreadMessages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => router.push(`/leads/${msg.lead.id}`)}
              className="bg-white dark:bg-gray-800 rounded-xl border-l-4 border-l-red-500 border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md cursor-pointer transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">NEW</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{msg.lead.projectName}</span>
                    <span className="text-xs text-gray-400">{msg.lead.customerName}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{msg.senderName}:</span> {msg.content.slice(0, 150)}
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(msg.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Conversations */}
      {tab === "all" && (
        <div className="space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
              <p className="text-gray-400 text-sm">No conversations yet</p>
            </div>
          ) : conversations.map((conv) => (
            <div
              key={conv.leadId}
              onClick={() => router.push(`/leads/${conv.leadId}`)}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-4 hover:shadow-md cursor-pointer transition ${
                conv.unreadCount > 0 ? "border-l-4 border-l-[#01358d] border-gray-200 dark:border-gray-700" : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{conv.projectName}</span>
                    <span className="text-xs text-gray-400">{conv.customerName}</span>
                    {conv.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{conv.unreadCount}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {conv.lastSenderType === "customer" ? conv.customerName : "You"}: {conv.lastMessage}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{timeAgo(conv.lastMessageAt)}</p>
                  <p className="text-[10px] text-gray-400">{conv.totalMessages} msg{conv.totalMessages !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
