import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Factory — KITLabs",
  description: "Turn your app idea into reality. Describe your concept, visualize it, and build it — all in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <nav className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/kitlabs-logo.jpg" alt="KITLabs" className="h-8 w-8 rounded-lg object-cover" />
              <div>
                <span className="text-sm font-bold text-[#01358d]">App Factory</span>
                <span className="text-[10px] text-gray-400 block -mt-0.5">by KITLabs</span>
              </div>
            </a>
            <div className="flex items-center gap-4">
              <a href="/start" className="text-sm text-gray-600 hover:text-[#01358d] transition">Start Building</a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
