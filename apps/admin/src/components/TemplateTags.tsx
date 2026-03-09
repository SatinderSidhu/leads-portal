"use client";

import { useState } from "react";

const TAGS = [
  {
    tag: "{{customerName}}",
    description: "The customer's full name",
    example: "John Smith",
  },
  {
    tag: "{{projectName}}",
    description: "The project/lead name",
    example: "Website Redesign",
  },
  {
    tag: "{{customerEmail}}",
    description: "The customer's email address",
    example: "john@example.com",
  },
  {
    tag: "{{customerPhone}}",
    description: "The customer's phone number",
    example: "(555) 123-4567",
  },
  {
    tag: "{{customerCity}}",
    description: "The customer's city",
    example: "Toronto",
  },
  {
    tag: "{{status}}",
    description: "Current lead status",
    example: "Design Ready",
  },
  {
    tag: "{{stage}}",
    description: "Current lead stage (Cold, Warm, Hot, Active, Closed)",
    example: "Warm",
  },
  {
    tag: "{{source}}",
    description: "How the lead was acquired",
    example: "Bark",
  },
  {
    tag: "{{dateCreated}}",
    description: "Date the lead was created",
    example: "March 8, 2026",
  },
];

export default function TemplateTags() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function copyTag(tag: string) {
    navigator.clipboard.writeText(tag);
    setCopied(tag);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition"
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Available Template Tags
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            — Click a tag to copy
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Example usage */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1.5">
              Example Usage
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300 font-mono leading-relaxed">
              Hi {"{{customerName}}"}, your project <strong>{"{{projectName}}"}</strong> is now in the <strong>{"{{status}}"}</strong> phase.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              Renders as: Hi John Smith, your project <strong>Website Redesign</strong> is now in the <strong>Design Ready</strong> phase.
            </p>
          </div>

          {/* Tags grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {TAGS.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={() => copyTag(item.tag)}
                className="group text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <code className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded">
                    {item.tag}
                  </code>
                  {copied === item.tag ? (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Copied!</span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-gray-300 group-hover:text-teal-500 transition">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">e.g. {item.example}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
