"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/ThemeToggle";

const DATA_CENTERS = [
  { value: "us", label: "United States (.com)" },
  { value: "eu", label: "Europe (.eu)" },
  { value: "in", label: "India (.in)" },
  { value: "au", label: "Australia (.com.au)" },
  { value: "jp", label: "Japan (.jp)" },
  { value: "ca", label: "Canada (.ca)" },
];

export default function ZohoSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Config state
  const [configured, setConfigured] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [dataCenter, setDataCenter] = useState("us");
  const [enabled, setEnabled] = useState(false);
  const [hasRefreshToken, setHasRefreshToken] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Grant token for authorization
  const [grantToken, setGrantToken] = useState("");

  useEffect(() => {
    fetch("/api/zoho/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.configured) {
          setConfigured(true);
          setDataCenter(data.dataCenter || "us");
          setEnabled(data.enabled || false);
          setHasRefreshToken(data.hasRefreshToken || false);
          setOrgId(data.orgId || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveCredentials() {
    if (!clientId.trim() || !clientSecret.trim()) {
      setMessage({ type: "error", text: "Client ID and Client Secret are required" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/zoho/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim(), dataCenter }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfigured(true);
        setMessage({ type: "success", text: "Credentials saved. Now authorize with a grant token." });
        setClientId("");
        setClientSecret("");
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save credentials" });
    } finally {
      setSaving(false);
    }
  }

  async function handleAuthorize() {
    if (!grantToken.trim()) {
      setMessage({ type: "error", text: "Grant token is required" });
      return;
    }
    setAuthorizing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/zoho/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "authorize", grantToken: grantToken.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setHasRefreshToken(true);
        setEnabled(true);
        setGrantToken("");
        setMessage({ type: "success", text: data.message || "Authorized successfully!" });
        // Re-fetch config to get org ID
        const configRes = await fetch("/api/zoho/config");
        const configData = await configRes.json();
        if (configData.orgId) setOrgId(configData.orgId);
      } else {
        setMessage({ type: "error", text: data.error || "Authorization failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Authorization failed" });
    } finally {
      setAuthorizing(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/zoho/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.orgId) setOrgId(data.orgId);
        setMessage({ type: "success", text: data.message || "Connection successful!" });
      } else {
        setMessage({ type: "error", text: data.error || "Connection test failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Connection test failed" });
    } finally {
      setTesting(false);
    }
  }

  async function handleToggleEnabled() {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    try {
      await fetch("/api/zoho/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newEnabled }),
      });
    } catch {
      setEnabled(!newEnabled); // revert
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01358d]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition"
            >
              &larr; Dashboard
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Zoho CRM Settings</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
          }`}>
            {message.text}
          </div>
        )}

        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Integration Status</h2>
            {configured && hasRefreshToken && (
              <button
                onClick={handleToggleEnabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition transform ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credentials</p>
              <p className={`text-sm font-medium mt-1 ${configured ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                {configured ? "Saved" : "Not configured"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Authorized</p>
              <p className={`text-sm font-medium mt-1 ${hasRefreshToken ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                {hasRefreshToken ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</p>
              <p className={`text-sm font-medium mt-1 ${enabled ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                {enabled ? "Enabled" : "Disabled"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Org ID</p>
              <p className="text-sm font-medium mt-1 text-gray-700 dark:text-gray-300">
                {orgId || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Credentials */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Step 1: API Credentials
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Create a Self Client at{" "}
            <a href="https://api-console.zoho.com" target="_blank" rel="noopener noreferrer" className="text-[#01358d] dark:text-blue-400 hover:underline">
              api-console.zoho.com
            </a>{" "}
            and enter the credentials below.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client ID {configured && <span className="text-green-600 dark:text-green-400 text-xs">(saved)</span>}
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder={configured ? "Enter new Client ID to update..." : "e.g. 1000.XXXXXXXXXXXX"}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client Secret {configured && <span className="text-green-600 dark:text-green-400 text-xs">(saved)</span>}
              </label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={configured ? "Enter new Client Secret to update..." : "Your client secret"}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Center
              </label>
              <select
                value={dataCenter}
                onChange={(e) => setDataCenter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                {DATA_CENTERS.map((dc) => (
                  <option key={dc.value} value={dc.value}>{dc.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSaveCredentials}
              disabled={saving || (!clientId.trim() && !clientSecret.trim())}
              className="bg-[#01358d] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? "Saving..." : configured ? "Update Credentials" : "Save Credentials"}
            </button>
          </div>
        </div>

        {/* Step 2: Authorization */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Step 2: Authorize
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            In the Zoho API Console, go to your Self Client and generate a grant token with scope:{" "}
            <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
              ZohoCRM.modules.leads.ALL,ZohoCRM.coql.READ,ZohoCRM.org.READ
            </code>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grant Token (one-time, expires in minutes)
              </label>
              <input
                type="text"
                value={grantToken}
                onChange={(e) => setGrantToken(e.target.value)}
                placeholder="Paste the grant token from Zoho API Console..."
                disabled={!configured}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700 disabled:opacity-50"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAuthorize}
                disabled={authorizing || !configured || !grantToken.trim()}
                className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {authorizing ? "Authorizing..." : "Authorize"}
              </button>
              {hasRefreshToken && (
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition"
                >
                  {testing ? "Testing..." : "Test Connection"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">How Zoho Integration Works</h3>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
            <li>When creating a new lead, check "Also create in Zoho CRM" to sync it automatically.</li>
            <li>For existing leads, use the "Create in Zoho" button on the lead detail page.</li>
            <li>Leads already in Zoho will show a direct link to open them in Zoho CRM.</li>
            <li>The integration maps: customer name, email, phone, city, zip, project description, and source.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
