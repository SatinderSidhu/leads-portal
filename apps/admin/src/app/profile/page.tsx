"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("../../components/RichTextEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
    ),
  }
);

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  username: string;
  profilePicture: string | null;
  emailSignature: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Personal info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);

  // Signature
  const [signature, setSignature] = useState("");
  const [sigSaving, setSigSaving] = useState(false);

  // Picture upload
  const [uploading, setUploading] = useState(false);

  async function fetchProfile() {
    const res = await fetch("/api/admin-users/me");
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setName(data.name);
      setEmail(data.email);
      setUsername(data.username);
      setSignature(data.emailSignature || "");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  async function handleSaveInfo() {
    if (!profile || !name.trim() || !email.trim() || !username.trim()) return;
    setInfoSaving(true);
    try {
      const body: Record<string, string> = {
        name: name.trim(),
        email: email.trim(),
        username: username.trim(),
      };
      if (password) body.password = password;

      const res = await fetch(`/api/admin-users/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setPassword("");
        await fetchProfile();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save");
      }
    } catch {
      alert("Failed to save");
    } finally {
      setInfoSaving(false);
    }
  }

  async function handleSaveSignature() {
    if (!profile) return;
    setSigSaving(true);
    try {
      const res = await fetch(`/api/admin-users/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailSignature: signature || null }),
      });
      if (res.ok) {
        await fetchProfile();
      } else {
        alert("Failed to save signature");
      }
    } catch {
      alert("Failed to save signature");
    } finally {
      setSigSaving(false);
    }
  }

  async function handleUploadPicture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `/api/admin-users/${profile.id}/upload-picture`,
        { method: "POST", body: formData }
      );
      if (res.ok) {
        await fetchProfile();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upload");
      }
    } catch {
      alert("Failed to upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-500 dark:text-gray-400">
          Could not load profile
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
        {/* Profile Picture */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Profile Picture
          </h2>
          <div className="flex items-center gap-6">
            {profile.profilePicture ? (
              <img
                src={profile.profilePicture}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                <span className="text-3xl text-gray-400 dark:text-gray-300 font-bold">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleUploadPicture}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 transition"
              >
                {uploading ? "Uploading..." : "Upload Picture"}
              </button>
              <p className="text-xs text-gray-400 mt-2">
                JPEG, PNG, GIF, or WebP. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Personal Information
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
              </div>
            </div>
            <button
              onClick={handleSaveInfo}
              disabled={!name.trim() || !email.trim() || !username.trim() || infoSaving}
              className="bg-[#01358d] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {infoSaving ? "Saving..." : "Save Info"}
            </button>
          </div>
        </div>

        {/* Email Signature */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Email Signature
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            This signature can be included when composing emails to leads.
          </p>
          <RichTextEditor
            content={signature}
            onChange={setSignature}
            placeholder="e.g. Best regards, John Doe | Company Name"
          />
          <button
            onClick={handleSaveSignature}
            disabled={sigSaving}
            className="mt-4 bg-teal-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {sigSaving ? "Saving..." : "Save Signature"}
          </button>
        </div>

        {/* Account Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Account Info
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>
              Member since{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {new Date(profile.createdAt).toLocaleDateString()}
              </span>
            </p>
          </div>
        </div>
    </div>
  );
}
