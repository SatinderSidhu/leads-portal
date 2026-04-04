"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const SOURCE_OPTIONS = [
  { value: "MANUAL", label: "Manual" },
  { value: "AGENT", label: "Agent" },
  { value: "BARK", label: "Bark" },
  { value: "LINKEDIN_SALES_NAV", label: "LinkedIn Sales Nav" },
  { value: "APOLLO", label: "Apollo.io" },
  { value: "LINKEDIN_COMPANY_PAGE", label: "LinkedIn Company Page" },
  { value: "REFERRAL", label: "Referral" },
  { value: "WEBSITE", label: "Website" },
  { value: "COLD_OUTREACH", label: "Cold Outreach" },
  { value: "EVENT", label: "Event" },
  { value: "OTHER", label: "Other" },
];

const STAGE_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "COLD", label: "Cold" },
  { value: "WARM", label: "Warm" },
  { value: "HOT", label: "Hot" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "RESPONDED", label: "Responded" },
  { value: "MEETING_BOOKED", label: "Meeting Booked" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "DISQUALIFIED", label: "Disqualified" },
  { value: "NURTURE", label: "Nurture" },
  { value: "ACTIVE", label: "Active" },
  { value: "CLOSED", label: "Closed" },
];

const inputClass = "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [zohoEnabled, setZohoEnabled] = useState(false);
  const [naicsSectors, setNaicsSectors] = useState<{ code: string; name: string; subsectors: { code: string; name: string }[] }[]>([]);
  const [createInZoho, setCreateInZoho] = useState(false);
  const [form, setForm] = useState({
    projectName: "",
    customerName: "",
    customerEmail: "",
    projectDescription: "",
    phone: "",
    city: "",
    zip: "",
    dateCreated: "",
    // New core contact fields
    jobTitle: "",
    companyName: "",
    location: "",
    linkedinUrl: "",
    apolloUrl: "",
    // Company intelligence
    industry: "",
    companySize: "",
    companyWebsite: "",
    naicsSectorCode: "",
    naicsSubsectorCode: "",
    aboutCompany: "",
    // Lead management
    source: "MANUAL",
    stage: "NEW",
    leadScore: "",
  });

  useEffect(() => {
    fetch("/api/zoho/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.enabled) {
          setZohoEnabled(true);
          setCreateInZoho(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/naics").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setNaicsSectors(d); }).catch(() => {});
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(sendEmail: boolean) {
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sendEmail,
          leadScore: form.leadScore ? parseInt(form.leadScore, 10) : null,
        }),
      });

      if (res.ok) {
        const lead = await res.json();
        if (createInZoho && zohoEnabled && lead.id) {
          try {
            await fetch("/api/zoho/create-lead", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ leadId: lead.id }),
            });
          } catch {
            console.warn("Failed to create lead in Zoho");
          }
        }
        router.push("/dashboard");
      } else {
        alert("Failed to create lead. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isValid =
    form.projectName.trim() &&
    form.customerName.trim() &&
    form.customerEmail.trim() &&
    form.projectDescription.trim();

  return (
    <div className="max-w-3xl space-y-6">
        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customerName" className={labelClass}>Customer Name *</label>
                <input id="customerName" type="text" value={form.customerName} onChange={(e) => updateField("customerName", e.target.value)} required className={inputClass} placeholder="e.g. John Smith" />
              </div>
              <div>
                <label htmlFor="customerEmail" className={labelClass}>Customer Email *</label>
                <input id="customerEmail" type="email" value={form.customerEmail} onChange={(e) => updateField("customerEmail", e.target.value)} required className={inputClass} placeholder="e.g. john@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="jobTitle" className={labelClass}>Job Title</label>
                <input id="jobTitle" type="text" value={form.jobTitle} onChange={(e) => updateField("jobTitle", e.target.value)} className={inputClass} placeholder="e.g. CTO, VP Engineering" />
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>Phone Number</label>
                <input id="phone" type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className={inputClass} placeholder="e.g. +1 (416) 555-0123" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="linkedinUrl" className={labelClass}>LinkedIn URL</label>
                <input id="linkedinUrl" type="url" value={form.linkedinUrl} onChange={(e) => updateField("linkedinUrl", e.target.value)} className={inputClass} placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label htmlFor="apolloUrl" className={labelClass}>Apollo URL</label>
                <input id="apolloUrl" type="url" value={form.apolloUrl} onChange={(e) => updateField("apolloUrl", e.target.value)} className={inputClass} placeholder="https://app.apollo.io/..." />
              </div>
              <div>
                <label htmlFor="location" className={labelClass}>Location</label>
                <input id="location" type="text" value={form.location} onChange={(e) => updateField("location", e.target.value)} className={inputClass} placeholder="e.g. San Francisco, CA" />
              </div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Company Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="companyName" className={labelClass}>Company Name</label>
                <input id="companyName" type="text" value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} className={inputClass} placeholder="e.g. Acme Corp" />
              </div>
              <div>
                <label htmlFor="industry" className={labelClass}>Industry</label>
                <input id="industry" type="text" value={form.industry} onChange={(e) => updateField("industry", e.target.value)} className={inputClass} placeholder="e.g. Software Development" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="companySize" className={labelClass}>Company Size</label>
                <input id="companySize" type="text" value={form.companySize} onChange={(e) => updateField("companySize", e.target.value)} className={inputClass} placeholder="e.g. 51-200" />
              </div>
              <div>
                <label htmlFor="companyWebsite" className={labelClass}>Company Website</label>
                <input id="companyWebsite" type="url" value={form.companyWebsite} onChange={(e) => updateField("companyWebsite", e.target.value)} className={inputClass} placeholder="https://acme.com" />
              </div>
            </div>
            <div>
              <label htmlFor="aboutCompany" className={labelClass}>About Company</label>
              <textarea id="aboutCompany" value={form.aboutCompany} onChange={(e) => updateField("aboutCompany", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="What does this company do? Their industry focus, products, services..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="naicsSectorCode" className={labelClass}>Industry Sector (NAICS)</label>
                <select id="naicsSectorCode" value={form.naicsSectorCode} onChange={(e) => { updateField("naicsSectorCode", e.target.value); updateField("naicsSubsectorCode", ""); }} className={inputClass}>
                  <option value="">Auto-detect from industry</option>
                  {naicsSectors.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="naicsSubsectorCode" className={labelClass}>Subsector (NAICS)</label>
                <select id="naicsSubsectorCode" value={form.naicsSubsectorCode} onChange={(e) => updateField("naicsSubsectorCode", e.target.value)} className={inputClass} disabled={!form.naicsSectorCode}>
                  <option value="">Auto-detect from industry</option>
                  {naicsSectors.find((s) => s.code === form.naicsSectorCode)?.subsectors.map((sub) => <option key={sub.code} value={sub.code}>{sub.code} — {sub.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Project Details</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="projectName" className={labelClass}>Project Name *</label>
              <input id="projectName" type="text" value={form.projectName} onChange={(e) => updateField("projectName", e.target.value)} required className={inputClass} placeholder="e.g. Mobile Banking App" />
            </div>
            <div>
              <label htmlFor="projectDescription" className={labelClass}>Project Description *</label>
              <textarea id="projectDescription" value={form.projectDescription} onChange={(e) => updateField("projectDescription", e.target.value)} required rows={4} className={inputClass + " resize-none"} placeholder="Describe the project requirements..." />
            </div>
          </div>
        </div>

        {/* Lead Classification */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Lead Classification</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="source" className={labelClass}>Lead Source</label>
                <select id="source" value={form.source} onChange={(e) => updateField("source", e.target.value)} className={inputClass}>
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="stage" className={labelClass}>Lead Stage</label>
                <select id="stage" value={form.stage} onChange={(e) => updateField("stage", e.target.value)} className={inputClass}>
                  {STAGE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="leadScore" className={labelClass}>Lead Score (1-100)</label>
                <input id="leadScore" type="number" min="1" max="100" value={form.leadScore} onChange={(e) => updateField("leadScore", e.target.value)} className={inputClass} placeholder="e.g. 75" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="city" className={labelClass}>City</label>
                <input id="city" type="text" value={form.city} onChange={(e) => updateField("city", e.target.value)} className={inputClass} placeholder="e.g. Toronto" />
              </div>
              <div>
                <label htmlFor="zip" className={labelClass}>Zip Code</label>
                <input id="zip" type="text" value={form.zip} onChange={(e) => updateField("zip", e.target.value)} className={inputClass} placeholder="e.g. M5V 2T6" />
              </div>
              <div>
                <label htmlFor="dateCreated" className={labelClass}>Date Created</label>
                <input id="dateCreated" type="date" value={form.dateCreated} onChange={(e) => updateField("dateCreated", e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          {zohoEnabled && (
            <div className="flex items-center gap-3 mb-4">
              <input
                id="createInZoho"
                type="checkbox"
                checked={createInZoho}
                onChange={(e) => setCreateInZoho(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#01358d] focus:ring-[#01358d]"
              />
              <label htmlFor="createInZoho" className="text-sm text-gray-700 dark:text-gray-300">
                Also create in Zoho CRM
              </label>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(false)}
              disabled={!isValid || loading}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition border border-gray-200 dark:border-gray-600"
            >
              {loading ? "Saving..." : "Save Only"}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={!isValid || loading}
              className="flex-1 bg-[#01358d] text-white py-2.5 rounded-lg font-medium hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Saving..." : "Save and Inform Client"}
            </button>
          </div>
        </div>
    </div>
  );
}
