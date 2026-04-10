export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2870a8] via-[#01358d] to-[#101b63] text-white">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Turn Your App Idea<br />Into Reality
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-10">
            Describe your concept, watch it come to life as interactive screens, and submit it for building — all in one guided experience.
          </p>
          <a
            href="/start"
            className="inline-flex items-center gap-2 bg-white text-[#01358d] px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-blue-50 transition shadow-lg"
          >
            Start Building
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#f9556d]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { step: "1", title: "Describe Your Idea", desc: "Tell us about your app in plain language. Our AI asks the right questions to understand your vision.", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
            { step: "2", title: "Visualize It", desc: "See your app as interactive screen mockups. Edit, refine, and iterate with AI until it's exactly right.", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" },
            { step: "3", title: "Submit for Build", desc: "One click to send your finalized design to our team. Configure your app store accounts while we build.", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
            { step: "4", title: "Enhance & Iterate", desc: "After delivery, request changes and improvements. Your app evolves with your business.", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#01358d]/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-[#01358d]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <div className="text-xs font-bold text-[#f9556d] mb-1">STEP {item.step}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Build Something Great?</h2>
          <p className="text-gray-500 mb-8">No account required. Just your idea and 5 minutes.</p>
          <a href="/start" className="inline-flex items-center gap-2 bg-[#01358d] text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-[#012a70] transition">
            Get Started Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/kitlabs-logo.jpg" alt="KITLabs" className="h-6 w-6 rounded object-cover" />
            <span className="text-xs text-gray-400">KITLabs Inc</span>
          </div>
          <span className="text-xs text-gray-400">&copy; {new Date().getFullYear()} KITLabs Inc. All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}
