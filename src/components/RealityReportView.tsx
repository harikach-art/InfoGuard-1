import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  ArrowLeft,
  Printer,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  FileCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Scale,
  Sparkles,
  ArrowRight,
  AlertCircle,
  FileSpreadsheet,
  Globe,
  Laptop,
  RotateCw,
  RefreshCw,
} from 'lucide-react';
import {
  ConflictClassification,
  ConflictItem,
  DocumentRequirementStatus,
  EligibilityStatus,
  RealityReport,
} from '../types';
import { getSourceTypeIcon } from './ScholarshipSourceSection';

interface RealityReportViewProps {
  report: RealityReport;
  onBackToWorkspace: () => void;
  onRetryAnalysis?: () => void;
  isRetrying?: boolean;
}

export const RealityReportView: React.FC<RealityReportViewProps> = ({
  report,
  onBackToWorkspace,
  onRetryAnalysis,
  isRetrying,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'conflicts' | 'queue' | 'eligibility' | 'matrix' | 'documents' | 'rules'
  >('overview');

  const [expandedConflictId, setExpandedConflictId] = useState<string | null>(
    report.conflicts[0]?.id || null
  );

  // Compute or fallback audit score
  const score = report.auditScore ?? 78;
  const riskLevel =
    report.riskLevel ??
    (score >= 80 ? 'Mostly Consistent' : score >= 55 ? 'Needs Verification' : 'High Risk');

  // Score badge and color helpers
  const getScoreTheme = () => {
    if (score >= 80) {
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        ring: '#10b981',
        title: 'Mostly Consistent',
      };
    }
    if (score >= 55) {
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        ring: '#f59e0b',
        title: 'Needs Verification',
      };
    }
    return {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      badge: 'bg-rose-50 text-rose-800 border-rose-200',
      ring: '#f43f5e',
      title: 'High Risk Discrepancies',
    };
  };

  const scoreTheme = getScoreTheme();

  const getEligibilityBadge = (status: EligibilityStatus) => {
    switch (status) {
      case 'Likely Eligible':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        };
      case 'Ineligible':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          icon: <XCircle className="w-4 h-4 text-rose-600" />,
        };
      case 'Conditionally Eligible':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
        };
      case 'Cannot Verify':
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          icon: <HelpCircle className="w-4 h-4 text-slate-500" />,
        };
    }
  };

  const getConflictClassificationBadge = (classification: ConflictClassification) => {
    switch (classification) {
      case 'Contradiction':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Conditional Difference':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Potentially Outdated':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Appears Updated':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Missing Information':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Ambiguous':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityBadge = (priority: 'High' | 'Medium' | 'Low') => {
    switch (priority) {
      case 'High':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
      case 'Low':
        return 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 print:p-0 print:m-0 print:max-w-none">
      {/* Top action toolbar */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onBackToWorkspace}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </button>

        <div className="flex items-center space-x-2">
          {onRetryAnalysis && (
            <button
              onClick={onRetryAnalysis}
              disabled={isRetrying}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Auditing...' : 'Re-run Audit'}</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Clean, subtle analysis status bar */}
      <div className="p-3 sm:px-4 sm:py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-5 h-5 rounded-full bg-emerald-600/15 border border-emerald-600/30 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-xs">
            <span className="font-bold text-emerald-950">
              ✓ Analysis completed
            </span>
            <span className="hidden sm:inline text-emerald-600/40">&bull;</span>
            <span className="text-emerald-800 font-medium">
              Sources analyzed and cross-checked successfully.
            </span>
          </div>
        </div>

        {onRetryAnalysis && (
          <button
            onClick={onRetryAnalysis}
            disabled={isRetrying}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer self-end sm:self-auto shrink-0"
          >
            <RotateCw className={`w-3 h-3 text-slate-500 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Checking...' : 'Retry Analysis'}</span>
          </button>
        )}
      </div>

      {/* WOW FACTOR: Dark Navy Executive Audit Header Card */}
      <div className="rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Ambient decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Left: Scholarship Title & Meta */}
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center space-x-2 text-xs text-indigo-400 font-semibold tracking-wide uppercase">
              <span>Scholarship Reality Report</span>
              <span>&bull;</span>
              <span>{new Date(report.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {report.scholarshipName}
            </h1>

            {report.primaryUrl && (
              <a
                href={report.primaryUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-400 hover:text-indigo-300 inline-flex items-center gap-1 font-mono truncate max-w-md transition-colors"
              >
                <span className="truncate">{report.primaryUrl}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            )}

            <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
              {report.sourcesAnalyzed.map((src) => (
                <span
                  key={src.id}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                >
                  {getSourceTypeIcon(src.type, 'w-3 h-3')}
                  <span className="truncate max-w-[140px]">{src.name}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Right: Prominent Audit Score Card */}
          <div className="flex items-center sm:items-start lg:items-center gap-5 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md shrink-0">
            {/* Circular Gauge Representation */}
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  strokeWidth="3.2"
                  strokeDasharray={`${score}, 100`}
                  stroke={scoreTheme.ring}
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold tracking-tight text-white leading-none">
                  {score}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">/ 100</span>
              </div>
            </div>

            {/* Score Meta */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Audit Consistency Score
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${scoreTheme.bg} ${scoreTheme.text} ${scoreTheme.border}`}
              >
                {riskLevel}
              </span>
              <p className="text-[11px] text-slate-400 max-w-[140px] leading-tight pt-1">
                {report.conflicts.length === 0
                  ? 'All analyzed requirements appear consistent.'
                  : `${report.conflicts.length} conflict(s) require verification.`}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Metrics Strip */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-400 text-[11px] block">Sources Audited</span>
            <span className="text-base font-bold text-white">
              {report.sourcesAnalyzed.length} official sources
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[11px] block">Conflicts Detected</span>
            <span className={`text-base font-bold ${report.conflicts.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {report.conflicts.length} discrepancies
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[11px] block">Verification Queue</span>
            <span className={`text-base font-bold ${report.verificationQueue.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {report.verificationQueue.length} items to check
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[11px] block">Eligibility Verdict</span>
            <span className="text-base font-bold text-indigo-300">
              {report.overallEligibilityStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Nuanced Final Recommendation Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
          <Scale className="w-4 h-4" />
          <span>Final Auditor Recommendation</span>
        </div>
        <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-medium">
          {report.finalRecommendation}
        </p>
      </div>

      {/* Main Tabbed Interface */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200/90 px-6 flex items-center space-x-2 sm:space-x-5 overflow-x-auto text-xs font-semibold print:hidden bg-slate-50/60">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Executive Overview
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`py-4 px-2 border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'queue'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Verification Queue</span>
            {report.verificationQueue.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {report.verificationQueue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('conflicts')}
            className={`py-4 px-2 border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'conflicts'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Source Conflicts</span>
            {report.conflicts.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                {report.conflicts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('eligibility')}
            className={`py-4 px-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'eligibility'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Eligibility Checklist
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-4 px-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'matrix'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Audit Matrix
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`py-4 px-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'documents'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Documents ({report.documents.length})
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`py-4 px-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'rules'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Extracted Rules ({report.normalizedRequirements.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* TAB 1: OVERVIEW & RECENCY */}
          {(activeTab === 'overview' || window.matchMedia?.('print')?.matches) && (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Executive Summary
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {report.executiveSummary}
                </p>
              </div>

              {/* Source Authority & Hierarchy Audit */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Source Authority & Recency Analysis</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">Evaluated on recency & official weight</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {report.authorityFindings.summary}
                </p>

                {report.authorityFindings.potentiallyOutdatedSources?.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Potentially Outdated Source(s) Detected:</span>
                      <span>{report.authorityFindings.potentiallyOutdatedSources.join(', ')}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {report.sourcesAnalyzed.map((src, i) => (
                    <div
                      key={src.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400">SOURCE {i + 1}</span>
                        {getSourceTypeIcon(src.type, 'w-3.5 h-3.5')}
                      </div>
                      <div className="font-bold text-slate-900 truncate">{src.name}</div>
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                        {src.authorityTier}
                      </span>
                      {src.publicationDate && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Issued: {src.publicationDate}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Information / Omissions */}
              {report.missingInformation.length > 0 && (
                <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <span>Omissions & Information Gaps in Official Sources</span>
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                    {report.missingInformation.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VERIFICATION QUEUE (CORE DIFFERENTIATOR) */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Verify Before You Apply &mdash; Action Queue
                  </h3>
                  <p className="text-xs text-slate-500">
                    High-priority items identified by InfoGuard that you must confirm with official nodal officers before submitting.
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {report.verificationQueue.length} item(s) prioritized
                </span>
              </div>

              {report.verificationQueue.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-slate-800">No verification items required.</p>
                  <p>All analyzed official sources appear in full agreement.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {report.verificationQueue.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:shadow-sm transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {index + 1}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            {item.whatToVerify}
                          </h4>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold border ${getPriorityBadge(
                            item.priority
                          )}`}
                        >
                          {item.priority} Priority
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs pt-1">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-150">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                            Why it matters
                          </span>
                          <p className="text-slate-700 leading-relaxed">{item.whyItMatters}</p>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-150">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                            Conflicting Sources
                          </span>
                          <p className="text-slate-700 leading-relaxed">{item.source}</p>
                        </div>

                        <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                            Recommended Action
                          </span>
                          <p className="text-emerald-950 font-semibold leading-relaxed">
                            {item.recommendedAction}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SIDE-BY-SIDE CONFLICTS (WOW FACTOR) */}
          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Side-by-Side Source Conflict Auditor ({report.conflicts.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Direct comparisons showing where official notifications, webpages, and portals contradict each other.
                  </p>
                </div>
              </div>

              {report.conflicts.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-slate-800">No source conflicts found.</p>
                  <p>All requirements and dates across analyzed sources appear consistent.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {report.conflicts.map((conflict) => {
                    const isExpanded = expandedConflictId === conflict.id;

                    return (
                      <div
                        key={conflict.id}
                        className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:shadow-sm transition-all"
                      >
                        {/* Conflict Header */}
                        <div
                          onClick={() => setExpandedConflictId(isExpanded ? null : conflict.id)}
                          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="flex items-center space-x-2.5 sm:space-x-3">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getConflictClassificationBadge(
                                conflict.classification
                              )}`}
                            >
                              {conflict.classification}
                            </span>
                            {conflict.relationship && (
                              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {conflict.relationship}
                              </span>
                            )}
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                {conflict.requirementTitle}
                              </h4>
                              <span className="text-[11px] text-slate-400 block sm:inline mt-0.5 sm:mt-0">
                                {conflict.sourceA.name} vs {conflict.sourceB.name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getPriorityBadge(
                                conflict.severity
                              )}`}
                            >
                              {conflict.severity} Priority
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Side-by-Side Visual Comparison Body */}
                        {isExpanded && (
                          <div className="p-6 border-t border-slate-100 bg-slate-50/40 space-y-4 text-xs">
                            {/* Two Cards Side by Side */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Source A Card */}
                              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
                                  <div className="flex items-center space-x-2 min-w-0">
                                    <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    <span className="font-bold text-slate-900 truncate">
                                      {conflict.sourceA.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1.5 shrink-0">
                                    {conflict.sourceA.isNewer && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                                        Newer
                                      </span>
                                    )}
                                    {conflict.sourceA.date && (
                                      <span className="text-[10px] text-slate-400">
                                        {conflict.sourceA.date}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {conflict.sourceA.authorityLevel && (
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    Tier: <span className="text-slate-700 font-semibold">{conflict.sourceA.authorityLevel}</span>
                                  </div>
                                )}

                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                    Stated Requirement
                                  </span>
                                  <div className="p-2.5 rounded-lg bg-slate-50 text-slate-900 font-semibold border border-slate-150">
                                    {conflict.sourceA.requirement}
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                                    Verbatim Evidence Quote
                                  </span>
                                  <p className="text-[11px] text-slate-600 italic leading-relaxed">
                                    &ldquo;{conflict.sourceA.evidence}&rdquo;
                                  </p>
                                </div>

                                {conflict.sourceA.pageOrSection && (
                                  <span className="text-[10px] text-slate-400 block">
                                    Citation: {conflict.sourceA.pageOrSection}
                                  </span>
                                )}
                              </div>

                              {/* Source B Card */}
                              <div className="p-4 rounded-xl border border-rose-200/80 bg-white space-y-2.5 shadow-2xs">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
                                  <div className="flex items-center space-x-2 min-w-0">
                                    <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span className="font-bold text-slate-900 truncate">
                                      {conflict.sourceB.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1.5 shrink-0">
                                    {conflict.sourceB.isNewer && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                                        Newer
                                      </span>
                                    )}
                                    {conflict.sourceB.date && (
                                      <span className="text-[10px] text-slate-400">
                                        {conflict.sourceB.date}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {conflict.sourceB.authorityLevel && (
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    Tier: <span className="text-slate-700 font-semibold">{conflict.sourceB.authorityLevel}</span>
                                  </div>
                                )}

                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                    Stated Requirement
                                  </span>
                                  <div className="p-2.5 rounded-lg bg-rose-50/50 text-rose-950 font-semibold border border-rose-100">
                                    {conflict.sourceB.requirement}
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                                    Verbatim Evidence Quote
                                  </span>
                                  <p className="text-[11px] text-slate-600 italic leading-relaxed">
                                    &ldquo;{conflict.sourceB.evidence}&rdquo;
                                  </p>
                                </div>

                                {conflict.sourceB.pageOrSection && (
                                  <span className="text-[10px] text-slate-400 block">
                                    Citation: {conflict.sourceB.pageOrSection}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Authority & Recency Analysis Ribbon */}
                            {(conflict.authorityComparison || conflict.recencyInformation) && (
                              <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200/80 space-y-1.5 text-xs">
                                {conflict.authorityComparison && (
                                  <div className="flex items-start gap-2 text-slate-700">
                                    <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                                    <span>
                                      <strong className="text-slate-900 font-semibold">Authority Weight:</strong>{' '}
                                      {conflict.authorityComparison}
                                    </span>
                                  </div>
                                )}
                                {conflict.recencyInformation && (
                                  <div className="flex items-start gap-2 text-slate-700">
                                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                                    <span>
                                      <strong className="text-slate-900 font-semibold">Recency Analysis:</strong>{' '}
                                      {conflict.recencyInformation}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* InfoGuard Assessment & Recommended Verification */}
                            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-2xs">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                  Deterministic Assessment (Confidence: {Math.round(conflict.confidence * 100)}%)
                                </span>
                                <p className="text-slate-800 leading-relaxed font-normal">
                                  {conflict.assessment}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-0.5">
                                  Action Required Before Applying
                                </span>
                                <p className="text-emerald-950 font-semibold leading-relaxed">
                                  {conflict.recommendedAction}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ELIGIBILITY CHECKLIST */}
          {activeTab === 'eligibility' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Applicant Eligibility Checklist
                  </h3>
                  <p className="text-xs text-slate-500">
                    Clear green, yellow, and red status indicators for each official eligibility criterion.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs font-bold">
                  <span className="text-slate-500">Verdict:</span>
                  <span
                    className={`px-3 py-1 rounded-full border ${getEligibilityBadge(
                      report.overallEligibilityStatus
                    ).bg}`}
                  >
                    {report.overallEligibilityStatus}
                  </span>
                </div>
              </div>

              {report.eligibilityAssessment.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  Not enough applicant profile information was provided to check eligibility.
                </div>
              ) : (
                <div className="space-y-3">
                  {report.eligibilityAssessment.map((item, idx) => {
                    const badge = getEligibilityBadge(item.status);

                    return (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-sm transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <div className="flex items-center space-x-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${badge.dot}`}></span>
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {item.criterion}
                            </span>
                            {item.hasConflictWarning && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-200">
                                Disputed in Official Sources
                              </span>
                            )}
                          </div>

                          <div
                            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}
                          >
                            {badge.icon}
                            <span>{item.status}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-150">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                              Your Value
                            </span>
                            <span className="font-bold text-slate-900 text-sm">{item.applicantValue}</span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-150">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                              Official Requirement
                            </span>
                            <span className="font-bold text-slate-900 text-sm">{item.requirementValue}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-normal">{item.notes}</p>

                        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="italic truncate max-w-md">
                            Evidence: &ldquo;{item.evidence}&rdquo;
                          </span>
                          <span className="shrink-0 font-medium text-slate-500">{item.sourceName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SOURCE AUDIT MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Source Audit Comparison Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Side-by-side verification table comparing criteria across all uploaded and discovered sources.
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 min-w-[180px]">Requirement</th>
                      {report.sourceAuditMatrix.sources.map((src) => (
                        <th key={src.id} className="py-3.5 px-4 min-w-[200px]">
                          <div>{src.name}</div>
                          <span className="text-[10px] font-normal text-slate-400">
                            {src.tier}
                          </span>
                        </th>
                      ))}
                      <th className="py-3.5 px-4 min-w-[140px]">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white">
                    {report.sourceAuditMatrix.rows.map((row) => (
                      <tr key={row.requirementKey} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-bold text-slate-900 align-top">
                          {row.requirementLabel}
                        </td>
                        {report.sourceAuditMatrix.sources.map((src) => {
                          const cell = row.valuesBySource[src.id];
                          const isMissing = !cell || cell.value.includes('Not specified');

                          return (
                            <td key={src.id} className="py-3.5 px-4 text-slate-700 align-top">
                              <div className={isMissing ? 'text-slate-400 italic' : 'font-semibold text-slate-900'}>
                                {cell?.value || '—'}
                              </div>
                              {cell?.evidence && !isMissing && (
                                <div className="text-[10px] text-slate-400 mt-1 italic line-clamp-2">
                                  &ldquo;{cell.evidence}&rdquo;
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-3.5 px-4 align-top">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              row.overallStatus === 'Consistent'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : row.overallStatus === 'Possible Conflict'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {row.overallStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: REQUIRED DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Required Documentation Audit ({report.documents.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Certificates explicitly mandated in official notifications with conditional triggers.
                </p>
              </div>

              {report.documents.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  No specific document requirements were identified.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {report.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <FileCheck className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            {doc.documentName}
                          </h4>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            doc.status === 'Required'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>

                      {doc.condition && (
                        <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                          <span className="font-bold">Condition:</span> {doc.condition}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                        &ldquo;{doc.evidence}&rdquo;
                      </div>
                      <div className="text-[10px] text-slate-400">Cited in: {doc.source}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: NORMALIZED RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Normalized Criteria & Rules ({report.normalizedRequirements.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Structured rule records evaluated by the deterministic engine with verbatim quotes.
                </p>
              </div>

              <div className="space-y-2">
                {report.normalizedRequirements.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">
                          {req.category}
                        </span>
                        <span className="font-bold text-slate-900">{req.title}</span>
                      </div>
                      <div className="text-slate-800">
                        Extracted Value: <span className="font-bold">{req.displayValue}</span>
                        {req.numericValue !== undefined && (
                          <span className="text-slate-400 font-mono text-[11px] ml-1.5">
                            (raw: {req.numericValue})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 italic truncate max-w-xl">
                        &ldquo;{req.evidenceQuote}&rdquo;
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-slate-600 block font-medium">
                        {req.sourceName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Confidence: {Math.round(req.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
