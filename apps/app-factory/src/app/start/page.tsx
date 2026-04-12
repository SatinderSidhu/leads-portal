"use client";

import { useEffect, useState } from "react";
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
    url: "https://www.kitlabs.us/portfolio/",
    gradient: "from-amber-400 to-orange-500",
    illustration: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Phone frame */}
        <rect x="68" y="8" width="64" height="104" rx="10" fill="white" fillOpacity="0.25" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
        <rect x="88" y="10" width="24" height="4" rx="2" fill="white" fillOpacity="0.3"/>
        {/* Map/GPS screen */}
        <rect x="72" y="20" width="56" height="50" rx="4" fill="white" fillOpacity="0.2"/>
        <circle cx="100" cy="40" r="8" fill="white" fillOpacity="0.35" stroke="white" strokeOpacity="0.6" strokeWidth="1"/>
        <circle cx="100" cy="40" r="3" fill="white" fillOpacity="0.7"/>
        {/* Route line */}
        <path d="M85 50 Q92 35, 100 40 Q108 45, 115 32" stroke="white" strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="3 2" fill="none"/>
        {/* Dog paw */}
        <circle cx="88" cy="82" r="4" fill="white" fillOpacity="0.5"/>
        <circle cx="82" cy="78" r="2.5" fill="white" fillOpacity="0.4"/>
        <circle cx="88" cy="75" r="2.5" fill="white" fillOpacity="0.4"/>
        <circle cx="94" cy="78" r="2.5" fill="white" fillOpacity="0.4"/>
        {/* Book button */}
        <rect x="76" y="92" width="48" height="10" rx="5" fill="white" fillOpacity="0.5"/>
        <text x="100" y="100" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">Book Walk</text>
        {/* Stars */}
        <circle cx="30" cy="25" r="2" fill="white" fillOpacity="0.3"/>
        <circle cx="170" cy="35" r="1.5" fill="white" fillOpacity="0.25"/>
        <circle cx="45" cy="85" r="1.5" fill="white" fillOpacity="0.2"/>
        <circle cx="160" cy="80" r="2" fill="white" fillOpacity="0.3"/>
      </svg>
    ),
  },
  {
    title: "Restaurant Ordering Platform",
    category: "Food & Beverage",
    prompt: "I want to build a restaurant ordering app where customers can browse menus, customize orders, pay online, and track delivery in real-time. Restaurant owners should have a dashboard to manage menus and orders.",
    description: "Menu management, order customization, payment integration, delivery tracking, restaurant dashboard",
    url: "https://www.kitlabs.us/portfolio/",
    gradient: "from-red-400 to-rose-500",
    illustration: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Phone frame */}
        <rect x="68" y="8" width="64" height="104" rx="10" fill="white" fillOpacity="0.25" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
        <rect x="88" y="10" width="24" height="4" rx="2" fill="white" fillOpacity="0.3"/>
        {/* Menu items */}
        <rect x="74" y="22" width="52" height="16" rx="4" fill="white" fillOpacity="0.2"/>
        <circle cx="84" cy="30" r="5" fill="white" fillOpacity="0.35"/>
        <rect x="92" y="27" width="28" height="3" rx="1.5" fill="white" fillOpacity="0.4"/>
        <rect x="92" y="32" width="18" height="2" rx="1" fill="white" fillOpacity="0.25"/>
        <rect x="74" y="42" width="52" height="16" rx="4" fill="white" fillOpacity="0.2"/>
        <circle cx="84" cy="50" r="5" fill="white" fillOpacity="0.35"/>
        <rect x="92" y="47" width="28" height="3" rx="1.5" fill="white" fillOpacity="0.4"/>
        <rect x="92" y="52" width="18" height="2" rx="1" fill="white" fillOpacity="0.25"/>
        <rect x="74" y="62" width="52" height="16" rx="4" fill="white" fillOpacity="0.2"/>
        <circle cx="84" cy="70" r="5" fill="white" fillOpacity="0.35"/>
        <rect x="92" y="67" width="28" height="3" rx="1.5" fill="white" fillOpacity="0.4"/>
        <rect x="92" y="72" width="18" height="2" rx="1" fill="white" fillOpacity="0.25"/>
        {/* Cart button */}
        <rect x="74" y="84" width="52" height="14" rx="7" fill="white" fillOpacity="0.5"/>
        <text x="100" y="93.5" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">Order Now</text>
        {/* Floating food icons */}
        <circle cx="35" cy="30" r="8" fill="white" fillOpacity="0.15"/>
        <text x="35" y="34" textAnchor="middle" fontSize="10">🍕</text>
        <circle cx="165" cy="45" r="7" fill="white" fillOpacity="0.15"/>
        <text x="165" y="49" textAnchor="middle" fontSize="9">🍔</text>
        <circle cx="42" cy="80" r="6" fill="white" fillOpacity="0.12"/>
        <text x="42" y="83.5" textAnchor="middle" fontSize="8">🥗</text>
        <circle cx="158" cy="85" r="6" fill="white" fillOpacity="0.12"/>
        <text x="158" y="88.5" textAnchor="middle" fontSize="8">🍣</text>
      </svg>
    ),
  },
  {
    title: "Fitness & Workout Tracker",
    category: "Health & Wellness",
    prompt: "I want to build a fitness app where users can follow workout plans, track their progress with charts, set goals, and share achievements with friends. Include a library of exercise videos with proper form guides.",
    description: "Workout plans, progress tracking, social features, exercise video library, goal setting",
    url: "https://www.kitlabs.us/portfolio/",
    gradient: "from-emerald-400 to-teal-500",
    illustration: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Phone frame */}
        <rect x="68" y="8" width="64" height="104" rx="10" fill="white" fillOpacity="0.25" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
        <rect x="88" y="10" width="24" height="4" rx="2" fill="white" fillOpacity="0.3"/>
        {/* Progress ring */}
        <circle cx="100" cy="45" r="16" stroke="white" strokeOpacity="0.2" strokeWidth="3" fill="none"/>
        <path d="M100 29 A16 16 0 1 1 84.5 51" stroke="white" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <text x="100" y="48" textAnchor="middle" fontSize="8" fill="white" fillOpacity="0.8" fontWeight="bold">78%</text>
        {/* Stats bars */}
        <rect x="76" y="68" width="8" height="20" rx="2" fill="white" fillOpacity="0.2"/>
        <rect x="76" y="76" width="8" height="12" rx="2" fill="white" fillOpacity="0.5"/>
        <rect x="88" y="68" width="8" height="20" rx="2" fill="white" fillOpacity="0.2"/>
        <rect x="88" y="72" width="8" height="16" rx="2" fill="white" fillOpacity="0.5"/>
        <rect x="100" y="68" width="8" height="20" rx="2" fill="white" fillOpacity="0.2"/>
        <rect x="100" y="70" width="8" height="18" rx="2" fill="white" fillOpacity="0.5"/>
        <rect x="112" y="68" width="8" height="20" rx="2" fill="white" fillOpacity="0.2"/>
        <rect x="112" y="74" width="8" height="14" rx="2" fill="white" fillOpacity="0.5"/>
        {/* Start workout button */}
        <rect x="76" y="94" width="48" height="10" rx="5" fill="white" fillOpacity="0.5"/>
        <text x="100" y="101.5" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">Start Workout</text>
        {/* Floating elements */}
        <circle cx="32" cy="35" r="7" fill="white" fillOpacity="0.12"/>
        <text x="32" y="38.5" textAnchor="middle" fontSize="9">💪</text>
        <circle cx="168" cy="30" r="6" fill="white" fillOpacity="0.12"/>
        <text x="168" y="33.5" textAnchor="middle" fontSize="8">🏃</text>
        <circle cx="38" cy="85" r="5" fill="white" fillOpacity="0.1"/>
        <text x="38" y="88" textAnchor="middle" fontSize="7">⏱️</text>
        <circle cx="162" cy="88" r="5.5" fill="white" fillOpacity="0.1"/>
        <text x="162" y="91" textAnchor="middle" fontSize="7">🎯</text>
      </svg>
    ),
  },
  {
    title: "Property Management App",
    category: "Real Estate",
    prompt: "I want to build a property management app for landlords and tenants. Landlords can list properties, collect rent online, handle maintenance requests. Tenants can pay rent, submit repair requests, and communicate with their landlord.",
    description: "Property listings, rent collection, maintenance requests, tenant-landlord messaging, document storage",
    url: "https://www.kitlabs.us/portfolio/",
    gradient: "from-blue-400 to-indigo-500",
    illustration: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Phone frame */}
        <rect x="68" y="8" width="64" height="104" rx="10" fill="white" fillOpacity="0.25" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
        <rect x="88" y="10" width="24" height="4" rx="2" fill="white" fillOpacity="0.3"/>
        {/* Property card */}
        <rect x="74" y="22" width="52" height="32" rx="4" fill="white" fillOpacity="0.2"/>
        {/* Building illustration */}
        <rect x="82" y="28" width="16" height="22" rx="1" fill="white" fillOpacity="0.35"/>
        <rect x="84" y="31" width="4" height="4" rx="0.5" fill="white" fillOpacity="0.2"/>
        <rect x="90" y="31" width="4" height="4" rx="0.5" fill="white" fillOpacity="0.2"/>
        <rect x="84" y="38" width="4" height="4" rx="0.5" fill="white" fillOpacity="0.2"/>
        <rect x="90" y="38" width="4" height="4" rx="0.5" fill="white" fillOpacity="0.2"/>
        <rect x="87" y="44" width="6" height="6" rx="0.5" fill="white" fillOpacity="0.3"/>
        {/* Price tag */}
        <rect x="102" y="30" width="20" height="8" rx="4" fill="white" fillOpacity="0.4"/>
        <text x="112" y="36" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">$2,100</text>
        {/* Stats row */}
        <rect x="74" y="58" width="24" height="14" rx="3" fill="white" fillOpacity="0.2"/>
        <text x="86" y="67" textAnchor="middle" fontSize="5" fill="white" fillOpacity="0.7">3 Bed</text>
        <rect x="102" y="58" width="24" height="14" rx="3" fill="white" fillOpacity="0.2"/>
        <text x="114" y="67" textAnchor="middle" fontSize="5" fill="white" fillOpacity="0.7">2 Bath</text>
        {/* Action buttons */}
        <rect x="74" y="78" width="52" height="10" rx="5" fill="white" fillOpacity="0.4"/>
        <text x="100" y="85" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">Pay Rent</text>
        <rect x="74" y="92" width="52" height="10" rx="5" fill="white" fillOpacity="0.25"/>
        <text x="100" y="99" textAnchor="middle" fontSize="5" fill="white" fillOpacity="0.8">Maintenance</text>
        {/* Floating elements */}
        <circle cx="35" cy="30" r="7" fill="white" fillOpacity="0.12"/>
        <text x="35" y="33.5" textAnchor="middle" fontSize="9">🏠</text>
        <circle cx="165" cy="40" r="6" fill="white" fillOpacity="0.12"/>
        <text x="165" y="43.5" textAnchor="middle" fontSize="8">🔑</text>
        <circle cx="160" cy="85" r="5.5" fill="white" fillOpacity="0.1"/>
        <text x="160" y="88.5" textAnchor="middle" fontSize="7">📋</text>
      </svg>
    ),
  },
  {
    title: "E-Learning Platform",
    category: "Education",
    prompt: "I want to build an e-learning app with video courses, quizzes, progress tracking, and certificates. Instructors should be able to create courses with modules. Students can enroll, learn at their own pace, and earn certifications.",
    description: "Video courses, quizzes, certificates, instructor dashboard, progress tracking, discussion forums",
    url: "https://www.kitlabs.us/portfolio/",
    gradient: "from-violet-400 to-purple-500",
    illustration: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Phone frame */}
        <rect x="68" y="8" width="64" height="104" rx="10" fill="white" fillOpacity="0.25" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
        <rect x="88" y="10" width="24" height="4" rx="2" fill="white" fillOpacity="0.3"/>
        {/* Video player */}
        <rect x="74" y="22" width="52" height="30" rx="4" fill="white" fillOpacity="0.2"/>
        <polygon points="96,32 96,42 106,37" fill="white" fillOpacity="0.6"/>
        <rect x="74" y="48" width="32" height="2" rx="1" fill="white" fillOpacity="0.4"/>
        <circle cx="106" cy="49" r="3" fill="white" fillOpacity="0.5"/>
        {/* Course list */}
        <rect x="74" y="56" width="52" height="12" rx="3" fill="white" fillOpacity="0.2"/>
        <circle cx="82" cy="62" r="3" fill="white" fillOpacity="0.4"/>
        <rect x="88" y="60" width="30" height="3" rx="1.5" fill="white" fillOpacity="0.35"/>
        <rect x="74" y="72" width="52" height="12" rx="3" fill="white" fillOpacity="0.2"/>
        <circle cx="82" cy="78" r="3" fill="white" fillOpacity="0.4"/>
        <rect x="88" y="76" width="26" height="3" rx="1.5" fill="white" fillOpacity="0.35"/>
        {/* Progress */}
        <rect x="76" y="90" width="48" height="4" rx="2" fill="white" fillOpacity="0.15"/>
        <rect x="76" y="90" width="30" height="4" rx="2" fill="white" fillOpacity="0.45"/>
        <text x="100" y="102" textAnchor="middle" fontSize="5" fill="white" fillOpacity="0.7">62% Complete</text>
        {/* Floating elements */}
        <circle cx="32" cy="32" r="7" fill="white" fillOpacity="0.12"/>
        <text x="32" y="35.5" textAnchor="middle" fontSize="9">🎓</text>
        <circle cx="168" cy="35" r="6" fill="white" fillOpacity="0.12"/>
        <text x="168" y="38.5" textAnchor="middle" fontSize="8">📖</text>
        <circle cx="40" cy="88" r="5" fill="white" fillOpacity="0.1"/>
        <text x="40" y="91" textAnchor="middle" fontSize="7">✏️</text>
        <circle cx="162" cy="90" r="5.5" fill="white" fillOpacity="0.1"/>
        <text x="162" y="93" textAnchor="middle" fontSize="7">🏆</text>
      </svg>
    ),
  },
  {
    title: "Appointment Booking System",
    category: "Professional Services",
    prompt: "I want to build an appointment booking app for salons, clinics, and consultants. Customers browse available slots, book appointments, get reminders. Businesses manage their calendar, staff schedules, and customer history.",
    description: "Calendar management, online booking, reminders, staff scheduling, customer profiles, payment processing",
    url: "https://www.kitlabs.us/portfolio/",
    gradient: "from-sky-400 to-cyan-500",
    illustration: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Phone frame */}
        <rect x="68" y="8" width="64" height="104" rx="10" fill="white" fillOpacity="0.25" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
        <rect x="88" y="10" width="24" height="4" rx="2" fill="white" fillOpacity="0.3"/>
        {/* Calendar header */}
        <rect x="74" y="20" width="52" height="10" rx="3" fill="white" fillOpacity="0.3"/>
        <text x="100" y="27.5" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">April 2026</text>
        {/* Calendar grid */}
        {[0,1,2,3,4,5,6].map((col) => (
          [0,1,2,3].map((row) => (
            <rect key={`${col}-${row}`} x={75 + col * 7} y={34 + row * 8} width="6" height="6" rx="1.5" fill="white" fillOpacity={col === 3 && row === 1 ? 0.6 : 0.15}/>
          ))
        ))}
        {/* Selected date highlight */}
        <circle cx={75 + 3*7 + 3} cy={34 + 1*8 + 3} r="3.5" fill="none" stroke="white" strokeOpacity="0.8" strokeWidth="1"/>
        {/* Time slots */}
        <rect x="74" y="70" width="25" height="10" rx="3" fill="white" fillOpacity="0.3"/>
        <text x="86.5" y="77" textAnchor="middle" fontSize="4.5" fill="white" fillOpacity="0.8">9:00 AM</text>
        <rect x="101" y="70" width="25" height="10" rx="3" fill="white" fillOpacity="0.2"/>
        <text x="113.5" y="77" textAnchor="middle" fontSize="4.5" fill="white" fillOpacity="0.6">10:30 AM</text>
        <rect x="74" y="82" width="25" height="10" rx="3" fill="white" fillOpacity="0.2"/>
        <text x="86.5" y="89" textAnchor="middle" fontSize="4.5" fill="white" fillOpacity="0.6">1:00 PM</text>
        <rect x="101" y="82" width="25" height="10" rx="3" fill="white" fillOpacity="0.2"/>
        <text x="113.5" y="89" textAnchor="middle" fontSize="4.5" fill="white" fillOpacity="0.6">3:30 PM</text>
        {/* Confirm button */}
        <rect x="76" y="96" width="48" height="10" rx="5" fill="white" fillOpacity="0.5"/>
        <text x="100" y="103.5" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">Confirm</text>
        {/* Floating elements */}
        <circle cx="34" cy="30" r="7" fill="white" fillOpacity="0.12"/>
        <text x="34" y="33.5" textAnchor="middle" fontSize="9">📅</text>
        <circle cx="166" cy="38" r="6" fill="white" fillOpacity="0.12"/>
        <text x="166" y="41.5" textAnchor="middle" fontSize="8">⏰</text>
        <circle cx="38" cy="88" r="5" fill="white" fillOpacity="0.1"/>
        <text x="38" y="91" textAnchor="middle" fontSize="7">💈</text>
        <circle cx="162" cy="85" r="5.5" fill="white" fillOpacity="0.1"/>
        <text x="162" y="88.5" textAnchor="middle" fontSize="7">✅</text>
      </svg>
    ),
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
  useEffect(() => {
    const saved = localStorage.getItem("appfactory_idea");
    if (saved) { setIdea(saved); localStorage.removeItem("appfactory_idea"); }
    const savedPlatforms = localStorage.getItem("appfactory_platforms");
    if (savedPlatforms) { try { setPlatform(JSON.parse(savedPlatforms)); localStorage.removeItem("appfactory_platforms"); } catch {} }

    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then((u) => { setUser(u); setAuthChecked(true); }).catch(() => setAuthChecked(true));
  }, []);

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
              <div className={`h-40 bg-gradient-to-br ${example.gradient} flex items-center justify-center overflow-hidden relative`}>
                {example.illustration}
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
