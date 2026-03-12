"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../../components/ThemeToggle";

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    projectName: "",
    customerName: "",
    customerEmail: "",
    projectDescription: "",
    phone: "",
    city: "",
    zip: "",
    dateCreated: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(sendEmail: boolean) {
    setLoading(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sendEmail }),
      });

      if (res.ok) {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition"
            >
              &larr; Back
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create New Lead</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-8">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="projectName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Project Name
              </label>
              <input
                id="projectName"
                type="text"
                value={form.projectName}
                onChange={(e) => updateField("projectName", e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                placeholder="e.g. Mobile Banking App"
              />
            </div>

            <div>
              <label
                htmlFor="customerName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Customer Name
              </label>
              <input
                id="customerName"
                type="text"
                value={form.customerName}
                onChange={(e) => updateField("customerName", e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                placeholder="e.g. John Smith"
              />
            </div>

            <div>
              <label
                htmlFor="customerEmail"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Customer Email
              </label>
              <input
                id="customerEmail"
                type="email"
                value={form.customerEmail}
                onChange={(e) => updateField("customerEmail", e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                placeholder="e.g. john@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="projectDescription"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Project Description
              </label>
              <textarea
                id="projectDescription"
                value={form.projectDescription}
                onChange={(e) =>
                  updateField("projectDescription", e.target.value)
                }
                required
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition resize-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                placeholder="Describe the project requirements..."
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                placeholder="e.g. +1 (416) 555-0123"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  placeholder="e.g. Toronto"
                />
              </div>
              <div>
                <label
                  htmlFor="zip"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Zip Code
                </label>
                <input
                  id="zip"
                  type="text"
                  value={form.zip}
                  onChange={(e) => updateField("zip", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  placeholder="e.g. M5V 2T6"
                />
              </div>
              <div>
                <label
                  htmlFor="dateCreated"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Date Created
                </label>
                <input
                  id="dateCreated"
                  type="date"
                  value={form.dateCreated}
                  onChange={(e) => updateField("dateCreated", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
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
      </main>
    </div>
  );
}
