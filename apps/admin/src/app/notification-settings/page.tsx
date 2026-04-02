"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Preferences {
  notificationEmail: string | null;
  newLeadCreated: boolean;
  emailSentToCustomer: boolean;
  customerResponse: boolean;
  customerPortalVisit: boolean;
  customerComment: boolean;
  leadStatusChange: boolean;
  leadAssigned: boolean;
  sowSigned: boolean;
  ndaSigned: boolean;
}

const NOTIFICATION_TYPES: { key: keyof Omit<Preferences, "notificationEmail">; label: string; description: string }[] = [
  { key: "newLeadCreated", label: "New Lead Created", description: "When a new lead is created via the portal or API" },
  { key: "emailSentToCustomer", label: "Email Sent to Customer", description: "When an email is sent to a customer on a lead you're watching or assigned to" },
  { key: "customerResponse", label: "Customer Response", description: "When a customer replies to an email or opens it" },
  { key: "customerPortalVisit", label: "Customer Portal Visit", description: "When a customer visits their project page on the customer portal" },
  { key: "customerComment", label: "Customer Comment", description: "When a customer leaves a comment on any section (Overview, SOW, App Flow)" },
  { key: "leadStatusChange", label: "Lead Status Change", description: "When the status of a lead you're watching changes" },
  { key: "leadAssigned", label: "Lead Assigned to You", description: "When a lead is assigned or reassigned to you" },
  { key: "sowSigned", label: "SOW Signed", description: "When a customer signs the Scope of Work" },
  { key: "ndaSigned", label: "NDA Signed", description: "When a customer signs the NDA" },
];

const defaults: Preferences = {
  notificationEmail: null,
  newLeadCreated: true,
  emailSentToCustomer: true,
  customerResponse: true,
  customerPortalVisit: true,
  customerComment: true,
  leadStatusChange: true,
  leadAssigned: true,
  sowSigned: true,
  ndaSigned: true,
};

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/notifications/preferences").then((r) => r.json()),
      fetch("/api/admin-users/me").then((r) => r.json()),
    ]).then(([prefsData, meData]) => {
      setPrefs({
        notificationEmail: prefsData.notificationEmail || null,
        newLeadCreated: prefsData.newLeadCreated ?? true,
        emailSentToCustomer: prefsData.emailSentToCustomer ?? true,
        customerResponse: prefsData.customerResponse ?? true,
        customerPortalVisit: prefsData.customerPortalVisit ?? true,
        customerComment: prefsData.customerComment ?? true,
        leadStatusChange: prefsData.leadStatusChange ?? true,
        leadAssigned: prefsData.leadAssigned ?? true,
        sowSigned: prefsData.sowSigned ?? true,
        ndaSigned: prefsData.ndaSigned ?? true,
      });
      setAdminEmail(meData.email || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      alert("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  function toggleAll(on: boolean) {
    setPrefs((prev) => {
      const updated = { ...prev };
      for (const t of NOTIFICATION_TYPES) {
        (updated as Record<string, unknown>)[t.key] = on;
      }
      return updated;
    });
  }

  const allOn = NOTIFICATION_TYPES.every((t) => (prefs as unknown as Record<string, unknown>)[t.key] === true);
  const allOff = NOTIFICATION_TYPES.every((t) => (prefs as unknown as Record<string, unknown>)[t.key] === false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01358d]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
        {/* Notification Email */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Notification Email</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            By default, notifications are sent to your profile email (<span className="font-medium">{adminEmail}</span>).
            You can provide an additional email address for notifications only.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Additional Notification Email (optional)
            </label>
            <input
              type="email"
              value={prefs.notificationEmail || ""}
              onChange={(e) => setPrefs((prev) => ({ ...prev, notificationEmail: e.target.value || null }))}
              placeholder="e.g. alerts@company.com"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              If set, notifications will be sent to this email instead of your profile email.
            </p>
          </div>
        </div>

        {/* Notification Toggles */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Notifications</h2>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAll(true)}
                disabled={allOn}
                className="text-xs text-[#01358d] dark:text-blue-400 hover:underline disabled:opacity-40 disabled:no-underline"
              >
                Enable All
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={() => toggleAll(false)}
                disabled={allOff}
                className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-40 disabled:no-underline"
              >
                Disable All
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {NOTIFICATION_TYPES.map((t) => {
              const enabled = (prefs as unknown as Record<string, unknown>)[t.key] as boolean;
              return (
                <div key={t.key} className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.description}</p>
                  </div>
                  <button
                    onClick={() => setPrefs((prev) => ({ ...prev, [t.key]: !enabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition transform ${
                      enabled ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#01358d] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">Saved!</span>
          )}
        </div>
    </div>
  );
}
