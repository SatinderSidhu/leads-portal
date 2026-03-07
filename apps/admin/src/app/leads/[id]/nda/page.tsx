"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Nda {
  id: string;
  content: string;
  status: string;
  signerName: string | null;
  signedAt: string | null;
  createdAt: string;
}

interface Lead {
  id: string;
  projectName: string;
  customerName: string;
  nda: Nda | null;
}

export default function NdaPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  async function fetchLead() {
    const res = await fetch(`/api/leads/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setLead(data);
      if (data.nda) {
        setContent(data.nda.content);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleSave() {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/nda`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setEditing(false);
        await fetchLead();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save");
      }
    } catch {
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!lead) return;
    if (!confirm("Send this NDA to the customer? They will receive an email with a link to review and sign it.")) return;
    setSending(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/nda/send`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchLead();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send");
      }
    } catch {
      alert("Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!lead || !lead.nda) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">NDA not found</p>
      </div>
    );
  }

  const nda = lead.nda;
  const isSigned = nda.status === "SIGNED";
  const isSent = nda.status === "SENT";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/leads/${lead.id}`)}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium transition"
            >
              &larr; Back to Lead
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              NDA — {lead.projectName}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {!isSigned && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Edit
              </button>
            )}
            {!isSigned && !isSent && !editing && (
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition"
              >
                {sending ? "Sending..." : "Send to Customer"}
              </button>
            )}
            {isSent && !editing && (
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition"
              >
                {sending ? "Resending..." : "Resend Email"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Status Bar */}
        <div className="bg-white rounded-xl border p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Status:</span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isSigned
                  ? "bg-green-100 text-green-800"
                  : isSent
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {isSigned ? "Signed" : isSent ? "Sent to Customer" : "Draft"}
            </span>
            {isSigned && nda.signerName && (
              <span className="text-sm text-gray-500">
                Signed by <strong className="text-gray-900">{nda.signerName}</strong> on{" "}
                {nda.signedAt ? new Date(nda.signedAt).toLocaleString() : "—"}
              </span>
            )}
          </div>
          <span className="text-sm text-gray-400">
            Created {new Date(nda.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* NDA Content */}
        <div className="bg-white rounded-xl border">
          {editing ? (
            <div>
              <div className="border-b px-6 py-3 flex items-center justify-between bg-gray-50 rounded-t-xl">
                <span className="text-sm font-medium text-gray-700">
                  Editing NDA
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setContent(nda.content);
                      setEditing(false);
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || content === nda.content}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-6 text-gray-700 text-sm leading-relaxed font-mono resize-none outline-none min-h-[600px]"
              />
            </div>
          ) : (
            <div className="p-6 md:p-10">
              <pre className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {nda.content}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
