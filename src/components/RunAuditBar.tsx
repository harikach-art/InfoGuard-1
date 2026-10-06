import React from 'react';
import { ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { ApplicantProfile, ScholarshipSource } from '../types';

interface RunAuditBarProps {
  primaryUrl: string;
  additionalSources: ScholarshipSource[];
  applicant: ApplicantProfile;
  onRunAudit: () => void;
  isRunning: boolean;
}

export const RunAuditBar: React.FC<RunAuditBarProps> = ({
  primaryUrl,
  additionalSources,
  applicant,
  onRunAudit,
  isRunning,
}) => {
  const hasOfficialSource = Boolean(primaryUrl.trim() || additionalSources.length > 0);
  const hasApplicantName = Boolean(applicant.name.trim());
  const hasCourse = Boolean(applicant.course.trim());
  const hasIncome = applicant.annualFamilyIncome !== undefined && applicant.annualFamilyIncome >= 0;

  let isValidUrl = true;
  if (primaryUrl.trim()) {
    try {
      new URL(primaryUrl.trim());
    } catch {
      isValidUrl = false;
    }
  }

  const isReady = hasOfficialSource && hasApplicantName && hasCourse && hasIncome && isValidUrl;

  const missingItems: string[] = [];
  if (!hasOfficialSource) missingItems.push('Official Scholarship Website or Uploaded Circular');
  if (!isValidUrl) missingItems.push('Valid HTTPS URL');
  if (!hasApplicantName) missingItems.push('Applicant Name');
  if (!hasCourse) missingItems.push('Degree / Course');
  if (!hasIncome) missingItems.push('Annual Family Income');

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-900/40 p-6 sm:p-7 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute right-0 top-0 w-96 h-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="space-y-1.5 z-10">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-md bg-indigo-500/20 text-indigo-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-bold tracking-tight text-white">
            Ready to Audit Official Scholarship Sources
          </h3>
        </div>

        {isReady ? (
          <p className="text-xs text-emerald-300 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              All required parameters validated. Cross-source comparison engine & deterministic rules primed.
            </span>
          </p>
        ) : (
          <p className="text-xs text-amber-300 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Required before audit: {missingItems.join(', ')}</span>
          </p>
        )}
      </div>

      <div className="w-full md:w-auto z-10 shrink-0">
        <button
          type="button"
          onClick={onRunAudit}
          disabled={!isReady || isRunning}
          className="w-full md:w-auto inline-flex items-center justify-center px-7 py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white text-sm font-bold tracking-tight transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none group cursor-pointer"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
              <span>Auditing Sources...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2 text-indigo-200" />
              <span>Analyze Scholarship &bull; Run InfoGuard</span>
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
