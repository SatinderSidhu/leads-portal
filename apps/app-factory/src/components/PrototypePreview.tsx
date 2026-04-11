"use client";

import { useState, useCallback } from "react";

interface ScreenElement {
  type: string;
  content?: string;
  placeholder?: string;
  navigateTo?: string;
}

interface Screen {
  id: string;
  name: string;
  description: string;
  elements: ScreenElement[];
  connections?: string[];
}

interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  accent: string;
  nav: string;
  button: string;
  bg: string;
}

interface PrototypePreviewProps {
  screens: Screen[];
  theme: ColorTheme;
  startScreenId?: string;
  onClose?: () => void;
  fullScreen?: boolean;
}

export default function PrototypePreview({ screens, theme, startScreenId, onClose, fullScreen }: PrototypePreviewProps) {
  const [currentScreenId, setCurrentScreenId] = useState(startScreenId || screens[0]?.id || "");
  const [history, setHistory] = useState<string[]>([]);
  const [transition, setTransition] = useState<"none" | "slide-left" | "slide-right" | "fade">("none");

  const currentScreen = screens.find((s) => s.id === currentScreenId);
  const currentIndex = screens.findIndex((s) => s.id === currentScreenId);

  const navigateTo = useCallback((targetId: string) => {
    if (!screens.find((s) => s.id === targetId)) return;
    setHistory((prev) => [...prev, currentScreenId]);
    setTransition("slide-left");
    setTimeout(() => { setCurrentScreenId(targetId); setTransition("none"); }, 300);
  }, [currentScreenId, screens]);

  const goBack = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setTransition("slide-right");
    setTimeout(() => { setCurrentScreenId(prev); setTransition("none"); }, 300);
  }, [history]);

  const jumpTo = useCallback((targetId: string) => {
    if (targetId === currentScreenId) return;
    setHistory((prev) => [...prev, currentScreenId]);
    setTransition("fade");
    setTimeout(() => { setCurrentScreenId(targetId); setTransition("none"); }, 200);
  }, [currentScreenId]);

  if (!currentScreen || screens.length === 0) {
    return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">No screens to preview</div>;
  }

  // Get fallback connections from screen-level connections
  const fallbackConnections = (currentScreen.connections || [])
    .map((id) => screens.find((s) => s.id === id))
    .filter(Boolean) as Screen[];

  const hasNavigableElements = currentScreen.elements.some((el) => el.navigateTo);

  return (
    <div className={`flex flex-col items-center ${fullScreen ? "min-h-screen bg-gray-950 py-8" : ""}`}>
      {/* Header bar */}
      <div className={`w-full max-w-md flex items-center justify-between mb-4 px-2 ${fullScreen ? "text-white" : "text-gray-700"}`}>
        <button
          onClick={goBack}
          disabled={history.length === 0}
          className={`flex items-center gap-1 text-sm font-medium transition ${history.length === 0 ? "opacity-30 cursor-not-allowed" : "hover:opacity-70"}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>
        <span className={`text-xs ${fullScreen ? "text-gray-400" : "text-gray-500"}`}>
          {currentIndex + 1} of {screens.length}: {currentScreen.name}
        </span>
        {onClose ? (
          <button onClick={onClose} className="text-sm font-medium hover:opacity-70 transition">✕ Close</button>
        ) : (
          <div className="w-12" />
        )}
      </div>

      {/* Phone frame */}
      <div className="relative w-[320px] overflow-hidden">
        <div
          className={`rounded-[2.5rem] border-[3px] border-gray-800 overflow-hidden shadow-2xl transition-all duration-300 ${
            transition === "slide-left" ? "translate-x-full opacity-0" :
            transition === "slide-right" ? "-translate-x-full opacity-0" :
            transition === "fade" ? "opacity-0 scale-95" :
            "translate-x-0 opacity-100"
          }`}
          style={{ backgroundColor: theme.bg }}
        >
          {/* Notch */}
          <div className="flex justify-center bg-gray-800 pt-2 pb-1">
            <div className="w-24 h-5 bg-gray-900 rounded-b-xl" />
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-6 py-1 text-[10px]" style={{ color: theme.primary }}>
            <span className="font-semibold">9:41</span>
            <div className="flex items-center gap-1">
              <span>📶</span><span>🔋</span>
            </div>
          </div>

          {/* Screen content */}
          <div className="min-h-[520px] flex flex-col bg-white">
            {currentScreen.elements.map((el, i) => (
              <InteractiveElement
                key={i}
                element={el}
                theme={theme}
                onNavigate={navigateTo}
              />
            ))}

            {/* Fallback navigation buttons (when no elements have navigateTo) */}
            {!hasNavigableElements && fallbackConnections.length > 0 && (
              <div className="px-4 py-3 mt-auto border-t border-gray-100">
                <p className="text-[9px] text-gray-400 mb-2 uppercase tracking-wider">Navigate to</p>
                <div className="flex flex-wrap gap-2">
                  {fallbackConnections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => navigateTo(s.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition hover:opacity-80 active:scale-95"
                      style={{ backgroundColor: theme.button }}
                    >
                      {s.name} →
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Home indicator */}
          <div className="flex justify-center py-3 bg-white">
            <div className="w-28 h-1 rounded-full bg-gray-300" />
          </div>
        </div>
      </div>

      {/* Screen navigator dots */}
      <div className="flex items-center gap-2 mt-6">
        {screens.map((s) => (
          <button
            key={s.id}
            onClick={() => jumpTo(s.id)}
            title={s.name}
            className={`transition-all ${
              s.id === currentScreenId
                ? "w-8 h-2.5 rounded-full"
                : "w-2.5 h-2.5 rounded-full hover:scale-125"
            }`}
            style={{
              backgroundColor: s.id === currentScreenId ? theme.primary : theme.primary + "40",
            }}
          />
        ))}
      </div>

      {/* Screen name below dots */}
      <p className={`text-xs mt-2 ${fullScreen ? "text-gray-500" : "text-gray-400"}`}>
        {currentScreen.name}
      </p>

      {/* Watermark for public preview */}
      {fullScreen && (
        <div className="mt-8 flex items-center gap-2 opacity-40">
          <span className="text-xs text-gray-500">Built with App Factory by KITLabs</span>
        </div>
      )}
    </div>
  );
}

// ── Interactive Element Renderer ──

function InteractiveElement({
  element,
  theme,
  onNavigate,
}: {
  element: ScreenElement;
  theme: ColorTheme;
  onNavigate: (targetId: string) => void;
}) {
  const isClickable = !!element.navigateTo;
  const clickProps = isClickable
    ? {
        onClick: () => onNavigate(element.navigateTo!),
        style: { cursor: "pointer" },
        role: "button" as const,
      }
    : {};

  const hoverClass = isClickable
    ? "hover:opacity-80 active:scale-[0.97] transition-all duration-150 relative group"
    : "";

  // Clickable indicator ring
  const clickIndicator = isClickable && (
    <div className="absolute inset-0 rounded border-2 border-transparent group-hover:border-blue-400 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.3)] transition-all pointer-events-none" />
  );

  switch (element.type) {
    case "nav-bar":
      return (
        <div {...clickProps} className={`text-white text-sm font-semibold px-4 py-2.5 ${hoverClass}`} style={{ backgroundColor: theme.nav, ...clickProps.style }}>
          {clickIndicator}
          {element.content || "App"}
        </div>
      );
    case "heading":
      return <div className="text-base font-bold px-4 py-1.5" style={{ color: theme.primary }}>{element.content}</div>;
    case "text":
      return <div className="text-xs text-gray-500 px-4 py-0.5">{element.content}</div>;
    case "input":
      return <div className="mx-4 my-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-400">{element.placeholder || "Input"}</div>;
    case "button":
      return (
        <div {...clickProps} className={`mx-4 my-1.5 px-3 py-2.5 text-white text-sm font-medium rounded-lg text-center ${hoverClass}`} style={{ backgroundColor: theme.button, ...clickProps.style }}>
          {clickIndicator}
          {element.content || "Button"}
        </div>
      );
    case "button-outline":
      return (
        <div {...clickProps} className={`mx-4 my-1.5 px-3 py-2.5 border-2 text-sm font-medium rounded-lg text-center ${hoverClass}`} style={{ borderColor: theme.button, color: theme.button, ...clickProps.style }}>
          {clickIndicator}
          {element.content || "Button"}
        </div>
      );
    case "card":
      return (
        <div {...clickProps} className={`mx-4 my-1.5 p-3 border border-gray-200 rounded-xl shadow-sm text-sm text-gray-600 ${hoverClass}`} style={clickProps.style}>
          {clickIndicator}
          {element.content || "Card"}
          {isClickable && <span className="text-[10px] text-gray-300 float-right mt-1">→</span>}
        </div>
      );
    case "list":
      return (
        <div className="mx-4 my-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} {...(i === 1 ? clickProps : {})} className={`py-2.5 px-1 border-b border-gray-100 text-sm text-gray-500 flex items-center justify-between ${i === 1 ? hoverClass : ""}`} style={i === 1 ? clickProps.style : {}}>
              {i === 1 && clickIndicator}
              <span>{element.content || `Item ${i}`}</span>
              {i === 1 && isClickable && <span className="text-gray-300 text-xs">›</span>}
            </div>
          ))}
        </div>
      );
    case "tab-bar":
      return (
        <div className="flex border-t border-gray-200 mt-auto">
          {["Home", "Search", "Profile"].map((label, i) => (
            <div key={label} {...(i === 0 ? clickProps : {})} className={`flex-1 py-2 text-center text-[11px] ${i === 0 ? `font-medium ${hoverClass}` : "text-gray-400"}`} style={i === 0 ? { color: theme.primary, ...clickProps.style } : {}}>
              {i === 0 && clickIndicator}
              {label}
            </div>
          ))}
        </div>
      );
    case "image":
      return <div className="mx-4 my-1.5 h-24 bg-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-300">Image</div>;
    case "avatar":
      return <div className="mx-4 my-1.5 w-12 h-12 rounded-full" style={{ backgroundColor: theme.accent + "40" }} />;
    case "search":
      return <div className="mx-4 my-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-400 flex items-center gap-1.5">🔍 {element.placeholder || "Search..."}</div>;
    case "toggle":
      return <div className="mx-4 my-1.5 flex items-center justify-between text-sm text-gray-600"><span>{element.content || "Toggle"}</span><div className="w-10 h-5 rounded-full" style={{ backgroundColor: theme.button }} /></div>;
    case "divider":
      return <div className="mx-4 my-2 border-t border-gray-100" />;
    case "social-login":
      return (
        <div {...clickProps} className={`mx-4 my-1.5 flex gap-3 justify-center ${hoverClass}`} style={clickProps.style}>
          {clickIndicator}
          {["G", "F", "A"].map((l) => <div key={l} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-sm text-gray-500">{l}</div>)}
        </div>
      );
    case "checkbox":
      return <div className="mx-4 my-1.5 flex items-center gap-2 text-sm text-gray-600"><div className="w-4 h-4 border-2 border-gray-300 rounded" />{element.content || "Checkbox"}</div>;
    case "radio":
      return <div className="mx-4 my-1.5 flex items-center gap-2 text-sm text-gray-600"><div className="w-4 h-4 border-2 border-gray-300 rounded-full" />{element.content || "Radio"}</div>;
    case "map":
      return <div className="mx-4 my-1.5 h-32 bg-green-50 rounded-xl flex items-center justify-center text-sm text-green-400">🗺️ Map</div>;
    default:
      return <div className="mx-4 my-1 text-xs text-gray-300">[{element.type}]</div>;
  }
}
