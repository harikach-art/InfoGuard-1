import React from 'react';
import { PlusCircle, Clock, LogOut, User, ShieldCheck, Sparkles } from 'lucide-react';
import { UserSession } from '../types';

interface HeaderProps {
  user: UserSession;
  historyCount: number;
  onNewAnalysis: () => void;
  onOpenHistory: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  historyCount,
  onNewAnalysis,
  onOpenHistory,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={onNewAnalysis}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-md shadow-indigo-600/30 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
            IG
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                InfoGuard
              </span>
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                Source Auditor
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              Know what&apos;s true before you apply.
            </p>
          </div>
        </div>

        {/* Navigation & User actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onNewAnalysis}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-sm shadow-indigo-600/20 hover:shadow-indigo-500/30"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Analysis</span>
          </button>

          <button
            onClick={onOpenHistory}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>History</span>
            {historyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-bold">
                {historyCount}
              </span>
            )}
          </button>

          {/* User profile pill */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
              <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                {user.name ? user.name[0].toUpperCase() : <User className="w-3 h-3" />}
              </div>
              <span className="font-medium max-w-[120px] truncate">{user.name}</span>
            </div>

            <button
              onClick={onSignOut}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors border border-transparent hover:border-slate-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
