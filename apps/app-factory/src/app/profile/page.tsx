"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profilePicture: string | null;
  companyName: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => {
        if (r.status === 401) { router.push("/login?returnTo=/profile"); return null; }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setProfile(d);
          setName(d.name || "");
          setPhone(d.phone || "");
          setCompanyName(d.companyName || "");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, companyName }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
      }
    } catch { alert("Failed to save"); }
    finally { setSaving(false); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/upload-picture", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setProfile((p) => p ? { ...p, profilePicture: data.filePath } : p);
      }
    } catch { alert("Upload failed"); }
    finally { setUploading(false); }
  }

  if (loading) return <main className="max-w-2xl mx-auto px-6 py-16"><p className="text-gray-400">Loading...</p></main>;
  if (!profile) return null;

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Profile</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        {/* Profile picture */}
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile.profilePicture ? (
              <img src={profile.profilePicture} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#01358d] flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-200">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition shadow-sm">
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              {uploading ? (
                <span className="text-xs animate-spin">⏳</span>
              ) : (
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              )}
            </label>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{profile.name}</div>
            <div className="text-sm text-gray-400">{profile.email}</div>
            <div className="text-xs text-gray-300 mt-1">Member since {new Date(profile.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#01358d] outline-none transition" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={profile.email} disabled className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact support if needed.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#01358d] outline-none transition" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#01358d] outline-none transition" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full py-2.5 bg-[#01358d] text-white rounded-xl font-medium hover:bg-[#012a70] disabled:opacity-50 transition">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </main>
  );
}
