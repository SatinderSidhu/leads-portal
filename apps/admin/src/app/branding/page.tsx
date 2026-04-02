"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface BrandingData {
  id: string;
  companyName: string;
  logoPath: string | null;
  website: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  footerText: string | null;
  copyrightText: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export default function BrandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#01358d");
  const [accentColor, setAccentColor] = useState("#f9556d");
  const [footerText, setFooterText] = useState("");
  const [copyrightText, setCopyrightText] = useState("");

  async function fetchBranding() {
    try {
      const res = await fetch("/api/branding");
      if (res.ok) {
        const data: BrandingData = await res.json();
        setBranding(data);
        setCompanyName(data.companyName || "");
        setWebsite(data.website || "");
        setPrimaryColor(data.primaryColor || "#01358d");
        setAccentColor(data.accentColor || "#f9556d");
        setFooterText(data.footerText || "");
        setCopyrightText(data.copyrightText || "");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBranding();
  }, []);

  async function handleSave() {
    if (!companyName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          website: website.trim() || null,
          primaryColor,
          accentColor,
          footerText: footerText.trim() || null,
          copyrightText: copyrightText.trim() || null,
        }),
      });
      if (res.ok) {
        await fetchBranding();
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

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/branding/upload-logo", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await fetchBranding();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upload logo");
      }
    } catch {
      alert("Failed to upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const previewCopyright = (copyrightText || "").replace(
    /\{year\}/g,
    new Date().getFullYear().toString()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Logo */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Company Logo
              </h2>
              <div className="flex items-center gap-6">
                {branding?.logoPath ? (
                  <img
                    src={branding.logoPath}
                    alt="Logo"
                    className="h-20 max-w-[200px] object-contain border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white"
                  />
                ) : (
                  <div className="h-20 w-[200px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-sm text-gray-400">No logo</span>
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    onChange={handleUploadLogo}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 transition"
                  >
                    {uploading ? "Uploading..." : "Upload Logo"}
                  </button>
                  <p className="text-xs text-gray-400 mt-2">
                    JPEG, PNG, GIF, WebP, or SVG. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Company Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer & Copyright */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Footer & Copyright
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Footer Text
                  </label>
                  <input
                    type="text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="e.g. KITLabs Inc — Custom Software Development"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Copyright Text
                  </label>
                  <input
                    type="text"
                    value={copyrightText}
                    onChange={(e) => setCopyrightText(e.target.value)}
                    placeholder="e.g. &copy; {year} KITLabs Inc. All rights reserved."
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{year}"}</code> as a placeholder for the current year.
                  </p>
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={!companyName.trim() || saving}
                className="bg-[#01358d] text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? "Saving..." : "Save Branding"}
              </button>
              {branding?.updatedBy && (
                <p className="text-xs text-gray-400">
                  Last updated by {branding.updatedBy} on{" "}
                  {new Date(branding.updatedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Right column — Live Preview */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Document Preview
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Preview how branding appears in SOW and App Flow documents.
              </p>

              {/* Preview card */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-white">
                {/* Header preview */}
                <div
                  className="px-4 py-3 flex items-center gap-3"
                  style={{ backgroundColor: primaryColor }}
                >
                  {branding?.logoPath && (
                    <img
                      src={branding.logoPath}
                      alt="Logo"
                      className="h-8 max-w-[80px] object-contain bg-white rounded px-1"
                    />
                  )}
                  <div>
                    <p className="text-white text-sm font-bold">
                      {companyName || "Company Name"}
                    </p>
                    {website && (
                      <p className="text-white/70 text-[10px]">{website}</p>
                    )}
                  </div>
                </div>

                {/* Content preview */}
                <div className="px-4 py-4">
                  <div className="h-2 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-2 bg-gray-200 rounded w-5/6 mb-2" />
                  <div className="h-2 bg-gray-100 rounded w-2/3 mb-4" />
                  <div className="h-2 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-2 bg-gray-200 rounded w-4/5" />
                </div>

                {/* Footer preview */}
                <div
                  className="px-4 py-2 border-t border-gray-200"
                  style={{ borderTopColor: accentColor }}
                >
                  {footerText && (
                    <p className="text-[10px] text-gray-500 text-center">
                      {footerText}
                    </p>
                  )}
                  {copyrightText && (
                    <p className="text-[9px] text-gray-400 text-center mt-0.5">
                      {previewCopyright}
                    </p>
                  )}
                </div>
              </div>

              {/* Color swatches */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border border-gray-200"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span className="text-xs text-gray-500">Primary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border border-gray-200"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="text-xs text-gray-500">Accent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
