"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Build {
  id: string;
  version: number;
  status: string;
  submittedAt: string;
  deliveredAt: string | null;
  notes: string | null;
}

interface AppStoreConfigData {
  id: string;
  platform: string;
  accountId: string | null;
  bundleId: string | null;
  connectionVerified: boolean;
  connectionVerifiedAt: string | null;
}

const BUILD_STATUS_STEPS = ["SUBMITTED", "IN_REVIEW", "BUILDING", "TESTING", "READY", "DELIVERED"];
const BUILD_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted", IN_REVIEW: "In Review", BUILDING: "Building",
  TESTING: "Testing", READY: "Ready", DELIVERED: "Delivered",
};

export default function BuildPage() {
  const { publicId } = useParams() as { publicId: string };
  const router = useRouter();

  // Build submission
  const [builds, setBuilds] = useState<Build[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // App Store configs
  const [configs, setConfigs] = useState<AppStoreConfigData[]>([]);
  const [activeStore, setActiveStore] = useState<"IOS" | "ANDROID" | null>(null);
  const [storeForm, setStoreForm] = useState({ accountId: "", bundleId: "", apiKey: "" });
  const [savingStore, setSavingStore] = useState(false);

  const fetchData = useCallback(() => {
    fetch(`/api/projects/${publicId}/builds`).then((r) => r.json()).then((d) => { if (Array.isArray(d)) setBuilds(d); });
    fetch(`/api/projects/${publicId}/app-store`).then((r) => r.json()).then((d) => { if (Array.isArray(d)) setConfigs(d); });
  }, [publicId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSubmitBuild() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${publicId}/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() || undefined }),
      });
      if (res.ok) {
        setSubmitted(true);
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to submit");
      }
    } catch { alert("Failed to submit"); }
    finally { setSubmitting(false); }
  }

  function openStoreConfig(platform: "IOS" | "ANDROID") {
    const existing = configs.find((c) => c.platform === platform);
    setActiveStore(platform);
    setStoreForm({
      accountId: existing?.accountId || "",
      bundleId: existing?.bundleId || "",
      apiKey: "",
    });
  }

  async function handleSaveStore() {
    if (!activeStore) return;
    setSavingStore(true);
    try {
      const res = await fetch(`/api/projects/${publicId}/app-store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: activeStore, ...storeForm }),
      });
      if (res.ok) {
        setActiveStore(null);
        fetchData();
      }
    } catch { alert("Failed to save"); }
    finally { setSavingStore(false); }
  }

  const latestBuild = builds[0];
  const hasBuilds = builds.length > 0;

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <a href={`/project/${publicId}`} className="text-sm text-gray-400 hover:text-[#01358d] transition">&larr; Back to project</a>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-2">Build Your App</h1>
      <p className="text-sm text-gray-500 mb-8">Submit your finalized design for building and configure your app store accounts.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Submit for Build ── */}
        <div className="space-y-6">
          {!hasBuilds && !submitted ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Submit for Build</h2>
              <p className="text-xs text-gray-500 mb-4">Your finalized design will be sent to the KITLabs team for development. We'll keep you updated on progress.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your company name"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition"
                  />
                </div>

                <button
                  onClick={handleSubmitBuild}
                  disabled={submitting}
                  className="w-full py-3 bg-[#01358d] text-white rounded-xl font-semibold hover:bg-[#012a70] disabled:opacity-50 transition"
                >
                  {submitting ? "Submitting..." : "Submit for Build"}
                </button>
              </div>
            </div>
          ) : (
            /* Build submitted — show status tracker */
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold text-gray-700">Build Status</h2>
                {latestBuild && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#01358d]/10 text-[#01358d] font-medium">
                    v{latestBuild.version}
                  </span>
                )}
              </div>

              {/* Progress tracker */}
              <div className="space-y-0">
                {BUILD_STATUS_STEPS.map((step, i) => {
                  const currentIdx = latestBuild ? BUILD_STATUS_STEPS.indexOf(latestBuild.status) : 0;
                  const isComplete = i <= currentIdx;
                  const isCurrent = i === currentIdx;

                  return (
                    <div key={step} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                          isComplete
                            ? "bg-[#01358d] border-[#01358d] text-white"
                            : "bg-white border-gray-200 text-gray-300"
                        }`}>
                          {isComplete ? "✓" : i + 1}
                        </div>
                        {i < BUILD_STATUS_STEPS.length - 1 && (
                          <div className={`w-0.5 h-8 ${isComplete ? "bg-[#01358d]" : "bg-gray-200"}`} />
                        )}
                      </div>
                      <div className="pt-1">
                        <div className={`text-sm font-medium ${isCurrent ? "text-[#01358d]" : isComplete ? "text-gray-700" : "text-gray-300"}`}>
                          {BUILD_STATUS_LABELS[step]}
                        </div>
                        {isCurrent && latestBuild && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            Since {new Date(latestBuild.submittedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {latestBuild?.notes && (
                <div className="mt-6 p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-700"><strong>Note from team:</strong> {latestBuild.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Build history */}
          {builds.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Build History</h2>
              <div className="space-y-2">
                {builds.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div>
                      <span className="text-sm font-medium text-gray-700">v{b.version}</span>
                      <span className="text-xs text-gray-400 ml-2">{new Date(b.submittedAt).toLocaleDateString()}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      b.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                      b.status === "BUILDING" ? "bg-orange-100 text-orange-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{BUILD_STATUS_LABELS[b.status] || b.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: App Store Configuration ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">App Store Configuration</h2>
            <p className="text-xs text-gray-500 mb-4">Connect your app store accounts so we can publish your app when it's ready.</p>

            {/* iOS */}
            {renderStoreCard("IOS", "Apple App Store", "Apple Developer Account", configs, openStoreConfig)}

            <div className="h-4" />

            {/* Android */}
            {renderStoreCard("ANDROID", "Google Play Store", "Google Play Console", configs, openStoreConfig)}
          </div>

          {/* Tips */}
          <div className="bg-blue-50 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[#01358d] mb-2">Need help?</h3>
            <ul className="space-y-2 text-xs text-blue-700">
              <li className="flex items-start gap-2"><span>📱</span><span><strong>iOS:</strong> You need an Apple Developer Account ($99/year). Get your Team ID from developer.apple.com → Account → Membership.</span></li>
              <li className="flex items-start gap-2"><span>🤖</span><span><strong>Android:</strong> You need a Google Play Console account ($25 one-time). Find your Developer ID in your Play Console settings.</span></li>
              <li className="flex items-start gap-2"><span>🔑</span><span><strong>API Keys:</strong> These allow us to upload builds directly. We'll guide you through creating them during the build process.</span></li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Store Config Modal ── */}
      {activeStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setActiveStore(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {activeStore === "IOS" ? "Apple App Store" : "Google Play Store"}
            </h3>
            <p className="text-sm text-gray-500 mb-5">Enter your {activeStore === "IOS" ? "Apple Developer" : "Google Play Console"} account details.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {activeStore === "IOS" ? "Team ID" : "Developer Account ID"}
                </label>
                <input
                  type="text"
                  value={storeForm.accountId}
                  onChange={(e) => setStoreForm({ ...storeForm, accountId: e.target.value })}
                  placeholder={activeStore === "IOS" ? "e.g. A1B2C3D4E5" : "e.g. 1234567890"}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#01358d] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {activeStore === "IOS" ? "Bundle ID" : "Package Name"}
                </label>
                <input
                  type="text"
                  value={storeForm.bundleId}
                  onChange={(e) => setStoreForm({ ...storeForm, bundleId: e.target.value })}
                  placeholder={activeStore === "IOS" ? "e.g. com.yourcompany.appname" : "e.g. com.yourcompany.appname"}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#01358d] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {activeStore === "IOS" ? "App Store Connect API Key" : "Service Account Key (JSON)"}
                </label>
                <textarea
                  value={storeForm.apiKey}
                  onChange={(e) => setStoreForm({ ...storeForm, apiKey: e.target.value })}
                  rows={3}
                  placeholder={activeStore === "IOS" ? "Paste your API key..." : "Paste your service account JSON..."}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#01358d] outline-none transition resize-y text-xs font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">This is encrypted and only used for build uploads. Optional — you can add it later.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setActiveStore(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">Cancel</button>
              <button
                onClick={handleSaveStore}
                disabled={savingStore || !storeForm.accountId.trim()}
                className="px-6 py-2 bg-[#01358d] text-white rounded-xl text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 transition"
              >
                {savingStore ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function renderStoreCard(
  platform: "IOS" | "ANDROID",
  title: string,
  subtitle: string,
  configs: AppStoreConfigData[],
  onConfigure: (p: "IOS" | "ANDROID") => void
) {
  const config = configs.find((c) => c.platform === platform);
  const isConfigured = !!config?.accountId;

  return (
    <div
      className={`p-4 rounded-xl border-2 transition cursor-pointer ${
        isConfigured
          ? "border-green-200 bg-green-50 hover:border-green-300"
          : "border-dashed border-gray-200 hover:border-[#01358d] hover:bg-[#01358d]/5"
      }`}
      onClick={() => onConfigure(platform)}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            {platform === "IOS" ? "🍎" : "🤖"} {title}
            {isConfigured && <span className="text-xs text-green-600 font-medium">✓ Connected</span>}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
          {isConfigured && config && (
            <div className="text-xs text-gray-400 mt-1 font-mono">{config.bundleId || config.accountId}</div>
          )}
        </div>
        <div className="text-xs font-medium text-[#01358d]">
          {isConfigured ? "Edit" : "Configure →"}
        </div>
      </div>
    </div>
  );
}
