import React from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Shield,
  FileCheck,
  CheckCircle2,
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
                Source Auditor
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenSignIn}
            className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer"
          >
            Sign in
          </button>
          <button
            onClick={onOpenSignUp}
            className="text-xs sm:text-sm font-medium px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 hover:shadow-indigo-500/30 cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-4xl mx-auto px-6 py-20 sm:py-28 flex flex-col items-center text-center my-auto">
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

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 max-w-3xl leading-[1.12]">
          Know what&apos;s true <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-indigo-200">
            before you apply.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-2xl leading-relaxed mb-10 font-normal">
          Compare official scholarship sources, detect conflicting requirements, and find what needs verification before you apply.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <button
            onClick={onOpenSignUp}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-semibold transition-all shadow-xl shadow-indigo-600/30 group ring-1 ring-white/20 cursor-pointer"
          >
            <span>Create an account</span>
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={onOpenSignIn}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-colors backdrop-blur-sm cursor-pointer"
          >
            Sign in
          </button>
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
