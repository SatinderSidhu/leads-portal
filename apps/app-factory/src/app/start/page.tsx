"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INDUSTRY_PROMPTS = [
  { name: "Agriculture & Farming", prompt: "I have an agriculture app idea that", icon: "🌾" },
  { name: "Mining & Energy", prompt: "I have a mining and energy app idea that", icon: "⛏️" },
  { name: "Utilities", prompt: "I have a utilities management app idea that", icon: "⚡" },
  { name: "Construction", prompt: "I have a construction app idea that", icon: "🏗️" },
  { name: "Manufacturing", prompt: "I have a manufacturing app idea that", icon: "🏭" },
  { name: "Wholesale Trade", prompt: "I have a wholesale trade app idea that", icon: "📦" },
  { name: "Retail & E-Commerce", prompt: "I have a retail app idea that", icon: "🛍️" },
  { name: "Transportation & Logistics", prompt: "I have a transportation app idea that", icon: "🚚" },
  { name: "Information & Technology", prompt: "I have a tech app idea that", icon: "💻" },
  { name: "Finance & Insurance", prompt: "I have a fintech app idea that", icon: "💳" },
  { name: "Real Estate", prompt: "I have a real estate app idea that", icon: "🏠" },
  { name: "Professional Services", prompt: "I have a professional services app idea that", icon: "💼" },
  { name: "Management & Consulting", prompt: "I have a management consulting app idea that", icon: "📊" },
  { name: "Administrative Services", prompt: "I have an administrative services app idea that", icon: "📋" },
  { name: "Education", prompt: "I have an education app idea that", icon: "🎓" },
  { name: "Healthcare", prompt: "I have a healthcare app idea that", icon: "🏥" },
  { name: "Arts & Entertainment", prompt: "I have an entertainment app idea that", icon: "🎭" },
  { name: "Food & Hospitality", prompt: "I have a food and hospitality app idea that", icon: "🍽️" },
  { name: "Other Services", prompt: "I have a service app idea that", icon: "🔧" },
  { name: "Government & Public", prompt: "I have a government services app idea that", icon: "🏛️" },
];

const PORTFOLIO_EXAMPLES = [
  {
    title: "On-Demand Dog Walking App",
    category: "Marketplace",
    prompt: "I want to build a mobile app for dog owners to find and book local dog walkers. Users should see walker profiles with reviews, book walks, track their dog's location in real-time during walks, and pay through the app.",
    description: "Real-time GPS tracking, in-app payments, review system, push notifications for walk updates",
    image: "/portfolio/dog-walking.png",
    url: "https://www.kitlabs.us/portfolio/",
  },
  {
    title: "Restaurant Ordering Platform",
    category: "Food & Beverage",
    prompt: "I want to build a restaurant ordering app where customers can browse menus, customize orders, pay online, and track delivery in real-time. Restaurant owners should have a dashboard to manage menus and orders.",
    description: "Menu management, order customization, payment integration, delivery tracking, restaurant dashboard",
    image: "/portfolio/restaurant.png",
    url: "https://www.kitlabs.us/portfolio/",
  },
  {
    title: "Fitness & Workout Tracker",
    category: "Health & Wellness",
    prompt: "I want to build a fitness app where users can follow workout plans, track their progress with charts, set goals, and share achievements with friends. Include a library of exercise videos with proper form guides.",
    description: "Workout plans, progress tracking, social features, exercise video library, goal setting",
    image: "/portfolio/fitness.png",
    url: "https://www.kitlabs.us/portfolio/",
  },
  {
    title: "Property Management App",
    category: "Real Estate",
    prompt: "I want to build a property management app for landlords and tenants. Landlords can list properties, collect rent online, handle maintenance requests. Tenants can pay rent, submit repair requests, and communicate with their landlord.",
    description: "Property listings, rent collection, maintenance requests, tenant-landlord messaging, document storage",
    image: "/portfolio/property.png",
    url: "https://www.kitlabs.us/portfolio/",
  },
  {
    title: "E-Learning Platform",
    category: "Education",
    prompt: "I want to build an e-learning app with video courses, quizzes, progress tracking, and certificates. Instructors should be able to create courses with modules. Students can enroll, learn at their own pace, and earn certifications.",
    description: "Video courses, quizzes, certificates, instructor dashboard, progress tracking, discussion forums",
    image: "/portfolio/elearning.png",
    url: "https://www.kitlabs.us/portfolio/",
  },
  {
    title: "Appointment Booking System",
    category: "Professional Services",
    prompt: "I want to build an appointment booking app for salons, clinics, and consultants. Customers browse available slots, book appointments, get reminders. Businesses manage their calendar, staff schedules, and customer history.",
    description: "Calendar management, online booking, reminders, staff scheduling, customer profiles, payment processing",
    image: "/portfolio/booking.png",
    url: "https://www.kitlabs.us/portfolio/",
  },
];

export default function StartPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState<string[]>(["ios", "android"]);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Restore idea from localStorage on mount + check auth
  useState(() => {
    const saved = localStorage.getItem("appfactory_idea");
    if (saved) { setIdea(saved); localStorage.removeItem("appfactory_idea"); }
    const savedPlatforms = localStorage.getItem("appfactory_platforms");
    if (savedPlatforms) { try { setPlatform(JSON.parse(savedPlatforms)); localStorage.removeItem("appfactory_platforms"); } catch {} }

    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then((u) => { setUser(u); setAuthChecked(true); }).catch(() => setAuthChecked(true));
  });

  function togglePlatform(p: string) {
    setPlatform((prev) => prev.includes(p) ? prev.filter((v) => v !== p) : [...prev, p]);
  }

  function selectPrompt(prompt: string) {
    setIdea(prompt + " ");
    // Focus the textarea
    const el = document.getElementById("idea-input") as HTMLTextAreaElement;
    if (el) { el.focus(); el.setSelectionRange(prompt.length + 1, prompt.length + 1); }
  }

  async function handleSubmit() {
    if (!idea.trim()) return;

    // Check if user is signed in
    if (!user) {
      // Save idea + platforms to localStorage so they persist through login/register
      localStorage.setItem("appfactory_idea", idea);
      localStorage.setItem("appfactory_platforms", JSON.stringify(platform));
      router.push("/login?returnTo=/start");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim(), platforms: platform }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/project/${data.publicId}/design`);
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      {/* Main input section */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">What&apos;s your app idea?</h1>
      <p className="text-gray-500 mb-8">Describe your concept in a few sentences. Our AI will help shape it into screens and flows.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 mb-12">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Your App Idea</label>
          <textarea
            id="idea-input"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={5}
            placeholder="Example: I want to build a mobile app for dog owners to find and book local dog walkers..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition resize-y text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Target Platforms</label>
          <div className="flex gap-3">
            {[
              { value: "ios", label: "iOS" },
              { value: "android", label: "Android" },
              { value: "web", label: "Web App" },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => togglePlatform(p.value)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition ${
                  platform.includes(p.value)
                    ? "border-[#01358d] bg-[#01358d]/5 text-[#01358d]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!idea.trim() || platform.length === 0 || submitting}
          className="w-full py-3 rounded-xl bg-[#01358d] text-white font-semibold text-lg hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? "Creating your project..." : user ? "Generate App Flow →" : "Sign In & Generate App Flow →"}
        </button>
      </div>

      {/* Industry prompts section */}
      <div className="mb-16">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Not sure where to start?</h2>
        <p className="text-gray-500 mb-6">Pick your industry to get a head start on your app idea.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {INDUSTRY_PROMPTS.map((industry) => (
            <button
              key={industry.name}
              onClick={() => selectPrompt(industry.prompt)}
              className="group p-3 rounded-xl border border-gray-200 hover:border-[#01358d] hover:bg-[#01358d]/5 transition text-left"
            >
              <div className="text-2xl mb-2">{industry.icon}</div>
              <div className="text-xs font-semibold text-gray-700 group-hover:text-[#01358d] transition leading-tight">{industry.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Portfolio examples section */}
      <div className="mb-16">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Get Inspired by Real Apps</h2>
        <p className="text-gray-500 mb-6">See what others have built with KITLabs. Click to explore, or use the prompt to start your own version.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PORTFOLIO_EXAMPLES.map((example) => (
            <div
              key={example.title}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-[#01358d]/30 transition group"
            >
              {/* Image placeholder — will be real screenshots from kitlabs.us/portfolio */}
              <div className="h-40 bg-gradient-to-br from-[#01358d]/10 to-[#f9556d]/10 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 text-[#01358d]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-medium text-[#01358d]/60">{example.category}</span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-1">{example.title}</h3>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{example.description}</p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectPrompt(example.prompt)}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#01358d]/10 text-[#01358d] text-xs font-medium hover:bg-[#01358d]/20 transition"
                  >
                    Use This Prompt
                  </button>
                  <a
                    href={example.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-lg border border-gray-200 text-gray-500 text-xs font-medium hover:border-[#01358d] hover:text-[#01358d] transition"
                  >
                    View →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
