import React from 'react';
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Globe,
  Sparkles,
  Search,
  Scale,
  Lock,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface BrandIntroProps {
  onOpenSignUp: () => void;
  onOpenSignIn: () => void;
}

export const BrandIntro: React.FC<BrandIntroProps> = ({ onOpenSignUp, onOpenSignIn }) => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[30%] -left-48 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[40%] -right-48 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Navigation Bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-800/60 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            IG
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">InfoGuard</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                Conflict Auditor
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenSignIn}
            className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800/80"
          >
            Sign in
          </button>
          <button
            onClick={onOpenSignUp}
            className="text-xs sm:text-sm font-medium px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 hover:shadow-indigo-500/30"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center">
        {/* Anti-Slop Distinctive Badge */}
        <div className="inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-medium tracking-wide mb-8 shadow-inner shadow-indigo-500/10 backdrop-blur-md">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span>Official Scholarship Source Conflict Auditor</span>
          <span className="text-slate-500">&bull;</span>
          <span className="text-slate-400 hidden sm:inline">Zero Blind AI Hallucinations</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 max-w-4xl leading-[1.12]">
          Know what&apos;s true <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-indigo-200">
            before you apply.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-2xl leading-relaxed mb-10 font-normal">
          InfoGuard audits official scholarship websites, circulars, and notifications against each other.
          It detects conflicting deadlines, income ceilings, and document discrepancies with verbatim evidence.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mb-20">
          <button
            onClick={onOpenSignUp}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-semibold transition-all shadow-xl shadow-indigo-600/30 group ring-1 ring-white/20"
          >
            <span>Create an account</span>
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={onOpenSignIn}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-colors backdrop-blur-sm"
          >
            Sign in to Workspace
          </button>
        </div>

        {/* Real Conflict Comparison Showcase (What makes InfoGuard different) */}
        <div className="w-full max-w-4xl rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6 sm:p-8 text-left shadow-2xl backdrop-blur-xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Interactive Audit Architecture
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-white mt-0.5">
                Why Official Sources Frequently Disagree
              </h3>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Deterministic Rule Verification</span>
            </div>
          </div>

          {/* Visual Source Comparison Grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source A Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-200">Source A: Official Scheme Webpage</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  Updated Aug 2026
                </span>
              </div>
              <div className="space-y-2 mt-3 text-xs">
                <div className="flex justify-between items-center py-1.5 px-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Application Deadline:</span>
                  <span className="font-semibold text-slate-200">October 15, 2026</span>
                </div>
                <div className="flex justify-between items-center py-1.5 px-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Family Income Limit:</span>
                  <span className="font-semibold text-slate-200">≤ ₹2,50,000 / year</span>
                </div>
              </div>
            </div>

            {/* Source B Card */}
            <div className="p-4 rounded-xl border border-rose-900/40 bg-slate-950/60 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-semibold text-slate-200">Source B: Issued Circular (PDF)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  Gazette Notice No. 42
                </span>
              </div>
              <div className="space-y-2 mt-3 text-xs">
                <div className="flex justify-between items-center py-1.5 px-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Application Deadline:</span>
                  <span className="font-semibold text-rose-400">October 31, 2026 (Extended)</span>
                </div>
                <div className="flex justify-between items-center py-1.5 px-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Family Income Limit:</span>
                  <span className="font-semibold text-amber-400">≤ ₹1,50,000 (Reserved)</span>
                </div>
              </div>
            </div>
          </div>

          {/* InfoGuard Audit Verdict Bar */}
          <div className="mt-4 p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                IG
              </div>
              <div>
                <span className="font-semibold text-slate-100 block">
                  InfoGuard Audit Engine Verdict:
                </span>
                <span className="text-slate-400 text-[11px]">
                  Conflict Flagged: &ldquo;Appears Updated&rdquo; for deadline &bull; &ldquo;Conditional Difference&rdquo; for income ceiling.
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20 text-[11px]">
                Needs Verification
              </span>
            </div>
          </div>

          {/* Value Highlights */}
          <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start space-x-2.5">
              <Scale className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">Deterministic Engine</span>
                <span className="text-slate-400 text-[11px]">Exact mathematical and date logic. No LLM math hallucinations.</span>
              </div>
            </div>
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">Verification Queue</span>
                <span className="text-slate-400 text-[11px]">Actionable checklist of what to verify with official nodal officers.</span>
              </div>
            </div>
            <div className="flex items-start space-x-2.5">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">Zero Promo Slop</span>
                <span className="text-slate-400 text-[11px]">Only official government & provider portals. Aggregators rejected.</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-300">INFOGUARD</span>
          <span>&mdash;</span>
          <span>Scholarship Source Conflict Auditor</span>
        </div>
        <div className="text-slate-500 text-center sm:text-right">
          Built for students &bull; Evidence-based &bull; Verifiable official audits
        </div>
      </footer>
    </div>
  );
};
