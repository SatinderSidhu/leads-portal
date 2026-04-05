"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  id: string;
  content: string;
  senderName: string;
  senderType: "customer" | "admin";
  readAt: string | null;
  createdAt: string;
}

interface ChatWidgetProps {
  leadId: string;
  isLoggedIn: boolean;
  customerName: string;
  returnTo: string;
}

export default function ChatWidget({ leadId, isLoggedIn, customerName, returnTo }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-open chat after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!open && isLoggedIn) setOpen(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMessages = useCallback(async () => {
    if (!isLoggedIn) return;
    const res = await fetch(`/api/messages?leadId=${leadId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        if (!open) {
          const unread = data.filter((m: Message) => m.senderType === "admin" && !m.readAt).length;
          setUnreadCount(unread);
        }
      }
    }
  }, [leadId, isLoggedIn, open]);

  useEffect(() => {
    fetchMessages();
    // Poll every 5 seconds when open, 15 seconds when closed (live chat feel)
    const interval = setInterval(fetchMessages, open ? 5000 : 15000);
    return () => clearInterval(interval);
  }, [fetchMessages, open]);

  // Play sound on new admin message
  useEffect(() => {
    if (messages.length > prevMessageCount && prevMessageCount > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.senderType === "admin") {
        try { new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1iZGBkcHV7goaIh4WDgH57enh4eXx+gIOGiIqKiYiGhIJ/fXt6ent8f4KFiIqLi4qJh4WCf317enl6fH+ChoiKi4uKiYeFgn99e3p5enx/goaIiouLiomHhYJ/fXt6eXp8f4KGiIqLi4qJh4WCf317enl6fH+ChoiKi4uKiYeFgn99e3p5enx/goaIiouLiomHhYJ/fQ==").play(); } catch {}
      }
    }
    setPrevMessageCount(messages.length);
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnreadCount(0);
    }
  }, [open, messages]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, content: input.trim() }),
      });
      if (res.ok) {
        setInput("");
        fetchMessages();
      }
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Chat bubble — always shows chat icon */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#01358d] text-white rounded-full shadow-lg hover:bg-[#012a70] hover:scale-105 transition-all flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden" style={{ maxHeight: "480px" }}>
          {/* Header with close button */}
          <div className="bg-[#01358d] text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Message KITLabs Team</p>
              <p className="text-[10px] text-white/70">We typically reply within a few hours</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {!isLoggedIn ? (
            /* Not signed in */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 dark:text-gray-600 mb-3">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Sign in to send a message to the KITLabs team.</p>
              <a
                href={`/login?returnTo=${returnTo}`}
                className="bg-[#01358d] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#012a70] transition"
              >
                Sign In
              </a>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: "250px" }}>
                {/* Welcome message (always shown at top) */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-gray-100 dark:bg-gray-800 px-3.5 py-2.5">
                    <p className="text-sm text-gray-900 dark:text-white">We are here to help you by answering any question. Please send us your question.</p>
                    <p className="text-[10px] mt-1 text-gray-400">KITLabs Team</p>
                  </div>
                </div>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderType === "customer" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                        msg.senderType === "customer"
                          ? "bg-[#01358d] text-white rounded-br-md"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.senderType === "customer" ? "text-white/60" : "text-gray-400"}`}>
                        {msg.senderName} &middot; {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-[#01358d]"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="w-9 h-9 bg-[#01358d] text-white rounded-full flex items-center justify-center hover:bg-[#012a70] disabled:opacity-50 transition flex-shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
