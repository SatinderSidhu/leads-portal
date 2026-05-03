"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import KioskSignInModal from "../../components/KioskSignInModal";

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
    title: "KITFit",
    category: "Fitness & Wellness",
    prompt: "I want to build an all-in-one wellness app combining fitness training, mental health support, and lifestyle management. Users can follow guided workout sessions, access mindset content, track progress, connect with a community, browse and purchase fitness products, and unlock premium features through membership plans.",
    description: "Guided fitness sessions, lifestyle & mindset content, community interaction, e-commerce integration, membership plans",
    url: "https://www.kitlabs.us/portfolio-item/kitfit-2/",
    gradient: "from-emerald-400 to-teal-500",
    illustration: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Phone frame */}
        <rect x="68" y="8" width="64" height="104" rx="10" fill="white" fillOpacity="0.25" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
        <rect x="88" y="10" width="24" height="4" rx="2" fill="white" fillOpacity="0.3"/>
        {/* Progress ring */}
        <circle cx="100" cy="42" r="16" stroke="white" strokeOpacity="0.2" strokeWidth="3" fill="none"/>
        <path d="M100 26 A16 16 0 1 1 84.5 48" stroke="white" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <text x="100" y="45" textAnchor="middle" fontSize="8" fill="white" fillOpacity="0.8" fontWeight="bold">78%</text>
        {/* Stats bars */}
        <rect x="76" y="65" width="8" height="20" rx="2" fill="white" fillOpacity="0.2"/>
        <rect x="76" y="73" width="8" height="12" rx="2" fill="white" fillOpacity="0.5"/>
        <rect x="88" y="65" width="8" height="20" rx="2" fill="white" fillOpacity="0.2"/>
        <rect x="88" y="69" width="8" height="16" rx="2" fill="white" fillOpacity="0.5"/>
        <rect x="100" y="65" width="8" height="20" rx="2" fill="white" fillOpacity="0.2"/>
        <rect x="100" y="67" width="8" height="18" rx="2" fill="white" fillOpacity="0.5"/>
        <rect x="112" y="65" width="8" height="20" rx="2" fill="white" fillOpacity="0.2"/>
        <rect x="112" y="71" width="8" height="14" rx="2" fill="white" fillOpacity="0.5"/>
        {/* Start workout button */}
        <rect x="76" y="92" width="48" height="10" rx="5" fill="white" fillOpacity="0.5"/>
        <text x="100" y="99.5" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">Start Session</text>
        {/* Floating elements */}
        <circle cx="32" cy="35" r="7" fill="white" fillOpacity="0.12"/>
        <text x="32" y="38.5" textAnchor="middle" fontSize="9">💪</text>
        <circle cx="168" cy="30" r="6" fill="white" fillOpacity="0.12"/>
        <text x="168" y="33.5" textAnchor="middle" fontSize="8">🏃</text>
        <circle cx="38" cy="85" r="5" fill="white" fillOpacity="0.1"/>
        <text x="38" y="88" textAnchor="middle" fontSize="7">🧘</text>
        <circle cx="162" cy="88" r="5.5" fill="white" fillOpacity="0.1"/>
        <text x="162" y="91" textAnchor="middle" fontSize="7">🛒</text>
      </svg>
    ),
  },
  {
    title: "Overdims",
    category: "Transportation & Logistics",
    prompt: "I want to build a logistics app that calculates state-wise permit costs for oversize and over-dimension truck loads across the US. Users input origin, destination, and load dimensions to get total permit cost estimates. Include PDF report generation, role-based access for trucking companies, freight brokers, and dispatchers, and secure document storage for MC/DOT numbers and compliance paperwork.",
    description: "Route-based permit costing, state-wise compliance, PDF reports, role-based access, document storage",
    url: "https://www.kitlabs.us/portfolio-item/overdims/",
    gradient: "from-amber-400 to-orange-500",
    illustration: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Phone frame */}
        <rect x="68" y="8" width="64" height="104" rx="10" fill="white" fillOpacity="0.25" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
        <rect x="88" y="10" width="24" height="4" rx="2" fill="white" fillOpacity="0.3"/>
        {/* Map area */}
        <rect x="72" y="20" width="56" height="35" rx="4" fill="white" fillOpacity="0.2"/>
        {/* Route line */}
        <circle cx="82" cy="33" r="3" fill="white" fillOpacity="0.6"/>
        <path d="M85 33 Q95 28, 100 38 Q105 48, 118 35" stroke="white" strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="3 2" fill="none"/>
        <circle cx="118" cy="35" r="3" fill="white" fillOpacity="0.6"/>
        {/* State permits list */}
        <rect x="74" y="60" width="52" height="10" rx="3" fill="white" fillOpacity="0.2"/>
        <rect x="76" y="63" width="8" height="4" rx="1" fill="white" fillOpacity="0.4"/>
        <rect x="86" y="63" width="20" height="3" rx="1.5" fill="white" fillOpacity="0.3"/>
        <text x="118" y="67" textAnchor="middle" fontSize="4.5" fill="white" fillOpacity="0.7">$340</text>
        <rect x="74" y="73" width="52" height="10" rx="3" fill="white" fillOpacity="0.2"/>
        <rect x="76" y="76" width="8" height="4" rx="1" fill="white" fillOpacity="0.4"/>
        <rect x="86" y="76" width="20" height="3" rx="1.5" fill="white" fillOpacity="0.3"/>
        <text x="118" y="80" textAnchor="middle" fontSize="4.5" fill="white" fillOpacity="0.7">$215</text>
        {/* Total / Generate button */}
        <rect x="76" y="90" width="48" height="12" rx="6" fill="white" fillOpacity="0.5"/>
        <text x="100" y="98.5" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">Get Report</text>
        {/* Floating elements */}
        <circle cx="34" cy="30" r="7" fill="white" fillOpacity="0.12"/>
        <text x="34" y="33.5" textAnchor="middle" fontSize="9">🚛</text>
        <circle cx="166" cy="35" r="6" fill="white" fillOpacity="0.12"/>
        <text x="166" y="38.5" textAnchor="middle" fontSize="8">📋</text>
        <circle cx="38" cy="88" r="5" fill="white" fillOpacity="0.1"/>
        <text x="38" y="91" textAnchor="middle" fontSize="7">🗺️</text>
        <circle cx="162" cy="85" r="5.5" fill="white" fillOpacity="0.1"/>
        <text x="162" y="88.5" textAnchor="middle" fontSize="7">📄</text>
      </svg>
    ),
  },
  {
    title: "Squabbler",
    category: "Social & Entertainment",
    prompt: "I want to build a social media app that turns online debates into structured, gamified discussions. Users present opposing viewpoints on topics like politics, sports, and relationships, and the community votes to determine a winner. Include real-time polling, social sharing, an apology gift card challenge where debaters purchase gift cards as stakes, and a secure payment system.",
    description: "Structured debates, community voting, real-time polls, gift card stakes, social sharing",
    url: "https://www.kitlabs.us/portfolio-item/squabbler/",
    gradient: "from-red-400 to-rose-500",
    illustration: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Phone frame */}
        <rect x="68" y="8" width="64" height="104" rx="10" fill="white" fillOpacity="0.25" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
        <rect x="88" y="10" width="24" height="4" rx="2" fill="white" fillOpacity="0.3"/>
        {/* VS badge */}
        <circle cx="100" cy="30" r="8" fill="white" fillOpacity="0.35" stroke="white" strokeOpacity="0.6" strokeWidth="1"/>
        <text x="100" y="33" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">VS</text>
        {/* User avatars */}
        <circle cx="82" cy="30" r="6" fill="white" fillOpacity="0.3"/>
        <circle cx="82" cy="28" r="3" fill="white" fillOpacity="0.5"/>
        <circle cx="118" cy="30" r="6" fill="white" fillOpacity="0.3"/>
        <circle cx="118" cy="28" r="3" fill="white" fillOpacity="0.5"/>
        {/* Topic card */}
        <rect x="74" y="42" width="52" height="14" rx="3" fill="white" fillOpacity="0.2"/>
        <rect x="78" y="46" width="44" height="3" rx="1.5" fill="white" fillOpacity="0.35"/>
        <rect x="78" y="51" width="30" height="2" rx="1" fill="white" fillOpacity="0.2"/>
        {/* Poll bars */}
        <rect x="74" y="60" width="52" height="8" rx="2" fill="white" fillOpacity="0.15"/>
        <rect x="74" y="60" width="34" height="8" rx="2" fill="white" fillOpacity="0.4"/>
        <text x="90" y="66" textAnchor="middle" fontSize="4.5" fill="white" fontWeight="bold">65%</text>
        <rect x="74" y="72" width="52" height="8" rx="2" fill="white" fillOpacity="0.15"/>
        <rect x="74" y="72" width="18" height="8" rx="2" fill="white" fillOpacity="0.25"/>
        <text x="82" y="78" textAnchor="middle" fontSize="4.5" fill="white" fontWeight="bold">35%</text>
        {/* Vote button */}
        <rect x="76" y="86" width="48" height="12" rx="6" fill="white" fillOpacity="0.5"/>
        <text x="100" y="94.5" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">Cast Vote</text>
        {/* Floating elements */}
        <circle cx="32" cy="28" r="7" fill="white" fillOpacity="0.12"/>
        <text x="32" y="31.5" textAnchor="middle" fontSize="9">⚖️</text>
        <circle cx="168" cy="32" r="6" fill="white" fillOpacity="0.12"/>
        <text x="168" y="35.5" textAnchor="middle" fontSize="8">🗳️</text>
        <circle cx="38" cy="88" r="5" fill="white" fillOpacity="0.1"/>
        <text x="38" y="91" textAnchor="middle" fontSize="7">🏆</text>
        <circle cx="162" cy="85" r="5.5" fill="white" fillOpacity="0.1"/>
        <text x="162" y="88.5" textAnchor="middle" fontSize="7">💬</text>
      </svg>
    ),
  },
  {
    title: "Care Partners",
    category: "Healthcare",
    prompt: "I want to build a caregiving coordination app for families managing care for loved ones. Support multiple roles like care providers, buddies, and patients with role-specific permissions. Include task scheduling with reminders, medication management, daily health tracking for mood and water intake, in-app messaging between care team members, and exportable monthly health reports.",
    description: "Multi-role caregiving, task scheduling, medication tracking, health monitoring, team messaging, reports",
    url: "https://www.kitlabs.us/portfolio-item/care-partners-project/",
    gradient: "from-blue-400 to-indigo-500",
    illustration: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Phone frame */}
        <rect x="68" y="8" width="64" height="104" rx="10" fill="white" fillOpacity="0.25" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
        <rect x="88" y="10" width="24" height="4" rx="2" fill="white" fillOpacity="0.3"/>
        {/* Heart + cross icon */}
        <rect x="94" y="20" width="12" height="12" rx="3" fill="white" fillOpacity="0.3"/>
        <rect x="98" y="23" width="4" height="6" rx="0.5" fill="white" fillOpacity="0.6"/>
        <rect x="96" y="25" width="8" height="2" rx="0.5" fill="white" fillOpacity="0.6"/>
        {/* Task list */}
        <rect x="74" y="36" width="52" height="12" rx="3" fill="white" fillOpacity="0.2"/>
        <rect x="77" y="40" width="4" height="4" rx="1" fill="white" fillOpacity="0.5"/>
        <path d="M78 42 L79 43 L80.5 41" stroke="white" strokeOpacity="0.8" strokeWidth="0.8" fill="none"/>
        <rect x="84" y="40" width="28" height="3" rx="1.5" fill="white" fillOpacity="0.35"/>
        <rect x="74" y="51" width="52" height="12" rx="3" fill="white" fillOpacity="0.2"/>
        <rect x="77" y="55" width="4" height="4" rx="1" fill="white" fillOpacity="0.3"/>
        <rect x="84" y="55" width="32" height="3" rx="1.5" fill="white" fillOpacity="0.35"/>
        <rect x="74" y="66" width="52" height="12" rx="3" fill="white" fillOpacity="0.2"/>
        <rect x="77" y="70" width="4" height="4" rx="1" fill="white" fillOpacity="0.3"/>
        <rect x="84" y="70" width="24" height="3" rx="1.5" fill="white" fillOpacity="0.35"/>
        {/* Team avatars row */}
        <circle cx="82" cy="88" r="5" fill="white" fillOpacity="0.3"/>
        <circle cx="92" cy="88" r="5" fill="white" fillOpacity="0.25"/>
        <circle cx="102" cy="88" r="5" fill="white" fillOpacity="0.2"/>
        <circle cx="112" cy="88" r="5" fill="white" fillOpacity="0.15"/>
        {/* Report button */}
        <rect x="76" y="96" width="48" height="10" rx="5" fill="white" fillOpacity="0.5"/>
        <text x="100" y="103" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">View Report</text>
        {/* Floating elements */}
        <circle cx="34" cy="28" r="7" fill="white" fillOpacity="0.12"/>
        <text x="34" y="31.5" textAnchor="middle" fontSize="9">❤️</text>
        <circle cx="166" cy="35" r="6" fill="white" fillOpacity="0.12"/>
        <text x="166" y="38.5" textAnchor="middle" fontSize="8">💊</text>
        <circle cx="38" cy="88" r="5" fill="white" fillOpacity="0.1"/>
        <text x="38" y="91" textAnchor="middle" fontSize="7">📊</text>
        <circle cx="162" cy="85" r="5.5" fill="white" fillOpacity="0.1"/>
        <text x="162" y="88.5" textAnchor="middle" fontSize="7">🔔</text>
      </svg>
    ),
  },
  {
    title: "My Digital Card",
    category: "Business & Networking",
    prompt: "I want to build a digital business card app that replaces paper cards. Users create customizable digital profiles with photos, logos, and professional info, then share instantly via QR codes and NFC tap-to-share. Include a contact management dashboard for organizing received contacts, cloud storage for access anywhere, and multi-platform sharing across social media and messaging apps.",
    description: "Digital business cards, QR code & NFC sharing, customizable profiles, contact management, cloud storage",
    url: "https://www.kitlabs.us/portfolio-item/my-digital-card/",
    gradient: "from-violet-400 to-purple-500",
    illustration: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Phone frame */}
        <rect x="68" y="8" width="64" height="104" rx="10" fill="white" fillOpacity="0.25" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
        <rect x="88" y="10" width="24" height="4" rx="2" fill="white" fillOpacity="0.3"/>
        {/* Profile area */}
        <circle cx="100" cy="32" r="10" fill="white" fillOpacity="0.3"/>
        <circle cx="100" cy="30" r="4" fill="white" fillOpacity="0.5"/>
        <path d="M92 38 Q96 34 100 36 Q104 34 108 38" fill="white" fillOpacity="0.3"/>
        <rect x="82" y="45" width="36" height="3" rx="1.5" fill="white" fillOpacity="0.45"/>
        <rect x="88" y="50" width="24" height="2" rx="1" fill="white" fillOpacity="0.25"/>
        {/* QR code */}
        <rect x="86" y="56" width="28" height="28" rx="3" fill="white" fillOpacity="0.2"/>
        <rect x="90" y="60" width="4" height="4" fill="white" fillOpacity="0.5"/>
        <rect x="96" y="60" width="4" height="4" fill="white" fillOpacity="0.35"/>
        <rect x="102" y="60" width="4" height="4" fill="white" fillOpacity="0.5"/>
        <rect x="90" y="66" width="4" height="4" fill="white" fillOpacity="0.35"/>
        <rect x="96" y="66" width="4" height="4" fill="white" fillOpacity="0.5"/>
        <rect x="102" y="66" width="4" height="4" fill="white" fillOpacity="0.35"/>
        <rect x="90" y="72" width="4" height="4" fill="white" fillOpacity="0.5"/>
        <rect x="96" y="72" width="4" height="4" fill="white" fillOpacity="0.35"/>
        <rect x="102" y="72" width="4" height="4" fill="white" fillOpacity="0.5"/>
        {/* Share button */}
        <rect x="76" y="92" width="48" height="12" rx="6" fill="white" fillOpacity="0.5"/>
        <text x="100" y="100.5" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">Share Card</text>
        {/* Floating elements */}
        <circle cx="34" cy="28" r="7" fill="white" fillOpacity="0.12"/>
        <text x="34" y="31.5" textAnchor="middle" fontSize="9">📇</text>
        <circle cx="166" cy="32" r="6" fill="white" fillOpacity="0.12"/>
        <text x="166" y="35.5" textAnchor="middle" fontSize="8">📱</text>
        <circle cx="38" cy="88" r="5" fill="white" fillOpacity="0.1"/>
        <text x="38" y="91" textAnchor="middle" fontSize="7">🔗</text>
        <circle cx="162" cy="85" r="5.5" fill="white" fillOpacity="0.1"/>
        <text x="162" y="88.5" textAnchor="middle" fontSize="7">☁️</text>
      </svg>
    ),
  },
  {
    title: "Whenworx",
    category: "Event Scheduling",
    prompt: "I want to build an intelligent event scheduling app that eliminates back-and-forth messaging for group coordination. Users create events, invite groups, and the app automatically syncs with their existing calendars to find available times. Include instant RSVP updates, interactive event chat with file sharing, admin controls for roles and permissions, and smart alerts to prevent missed appointments.",
    description: "Smart scheduling, calendar sync, group events, RSVP tracking, event chat, admin controls",
    url: "https://www.kitlabs.us/portfolio-item/whenworx/",
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
        {/* Event cards */}
        <rect x="74" y="70" width="52" height="12" rx="3" fill="white" fillOpacity="0.25"/>
        <rect x="76" y="73" width="3" height="6" rx="1" fill="white" fillOpacity="0.6"/>
        <rect x="82" y="73" width="24" height="3" rx="1.5" fill="white" fillOpacity="0.4"/>
        <text x="120" y="78" textAnchor="middle" fontSize="4" fill="white" fillOpacity="0.6">3 RSVPs</text>
        <rect x="74" y="84" width="52" height="12" rx="3" fill="white" fillOpacity="0.2"/>
        <rect x="76" y="87" width="3" height="6" rx="1" fill="white" fillOpacity="0.5"/>
        <rect x="82" y="87" width="20" height="3" rx="1.5" fill="white" fillOpacity="0.35"/>
        <text x="120" y="92" textAnchor="middle" fontSize="4" fill="white" fillOpacity="0.6">5 RSVPs</text>
        {/* Floating elements */}
        <circle cx="34" cy="30" r="7" fill="white" fillOpacity="0.12"/>
        <text x="34" y="33.5" textAnchor="middle" fontSize="9">📅</text>
        <circle cx="166" cy="38" r="6" fill="white" fillOpacity="0.12"/>
        <text x="166" y="41.5" textAnchor="middle" fontSize="8">🔔</text>
        <circle cx="38" cy="88" r="5" fill="white" fillOpacity="0.1"/>
        <text x="38" y="91" textAnchor="middle" fontSize="7">👥</text>
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
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const submitAfterSignInRef = useRef(false);

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

  async function submitProject(currentUser: { id: string; name: string; email: string }) {
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
    void currentUser;
  }

  async function handleSubmit() {
    if (!idea.trim()) return;

    // Not signed in → open the QR pairing modal so the customer can sign in from their phone
    if (!user) {
      submitAfterSignInRef.current = true;
      setSignInModalOpen(true);
      return;
    }

    await submitProject(user);
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

      {signInModalOpen && (
        <KioskSignInModal
          onCancel={() => {
            submitAfterSignInRef.current = false;
            setSignInModalOpen(false);
          }}
          onSignedIn={async (signedInUser) => {
            setUser(signedInUser);
            setSignInModalOpen(false);
            if (submitAfterSignInRef.current) {
              submitAfterSignInRef.current = false;
              await submitProject(signedInUser);
            }
          }}
        />
      )}
    </main>
  );
}
