import React from 'react';
import { Loader2, CheckCircle2, Clock, Shield, Sparkles } from 'lucide-react';

export const PIPELINE_STAGES = [
  'Reading official sources',
  'Discovering relevant official sources',
  'Extracting requirements',
  'Normalizing requirements',
  'Comparing sources',
  'Checking applicant eligibility',
  'Detecting conflicts',
  'Reviewing source authority and recency',
  'Preparing Reality Report',
];

interface AnalysisPipelineModalProps {
  currentStageIndex: number;
  error?: string | null;
  onDismissError?: () => void;
}

export const AnalysisPipelineModal: React.FC<AnalysisPipelineModalProps> = ({
  currentStageIndex,
  error,
  onDismissError,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-7 relative text-slate-100">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-indigo-600/10 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {error ? 'Analysis Interrupted' : 'InfoGuard Active Audit'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {error
                  ? 'Audit encountered an issue reading sources'
                  : 'Running semantic extraction & deterministic conflict engine'}
              </p>
            </div>
          </div>

          {!error && (
            <div className="flex items-center space-x-1.5 text-xs text-indigo-300 bg-indigo-950/80 border border-indigo-500/30 px-3 py-1 rounded-full font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Auditing...</span>
            </div>
          )}
        </div>

        {error ? (
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 leading-relaxed space-y-1">
              <span className="font-bold text-rose-200 block">Analysis Failure:</span>
              <p>{error}</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onDismissError}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Close and adjust sources
              </button>
            </div>
          </div>
        ) : (
          <div className="py-5 space-y-2">
            {PIPELINE_STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isUpcoming = idx > currentStageIndex;

              return (
                <div
                  key={stage}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                    isCurrent
                      ? 'bg-indigo-950/60 border border-indigo-500/30 text-white font-semibold shadow-inner'
                      : isPast
                      ? 'text-slate-300 font-normal'
                      : 'text-slate-500 font-normal'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {isPast && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {isCurrent && (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                    )}
                    {isUpcoming && (
                      <Clock className="w-4 h-4 text-slate-700 shrink-0" />
                    )}
                    <span>{stage}</span>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isCurrent
                        ? 'text-indigo-400'
                        : isPast
                        ? 'text-emerald-400'
                        : 'text-slate-600'
                    }`}
                  >
                    {isPast ? 'Verified' : isCurrent ? 'Active' : 'Queued'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Exact deterministic comparisons for numerical limits, income, and deadlines.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
