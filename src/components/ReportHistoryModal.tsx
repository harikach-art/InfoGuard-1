import React, { useState } from 'react';
import { X, Clock, Trash2, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { RealityReport } from '../types';
import { deleteReportApi } from '../services/api';

interface ReportHistoryModalProps {
  isOpen: boolean;
  reports: RealityReport[];
  onClose: () => void;
  onSelectReport: (report: RealityReport) => void;
  onRefreshReports: () => void;
}

export const ReportHistoryModal: React.FC<ReportHistoryModalProps> = ({
  isOpen,
  reports,
  onClose,
  onSelectReport,
  onRefreshReports,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this audit report?')) return;
    setDeletingId(id);
    try {
      await deleteReportApi(id);
      onRefreshReports();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white">
                Audit Report History
              </h2>
              <span className="text-[10px] text-slate-400">
                Saved official scholarship comparisons
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of Reports */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3">
          {reports.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No analyses yet.</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Audited scholarship reports will appear here once you run your first official source comparison.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => onSelectReport(report)}
                  className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/50 cursor-pointer transition-all shadow-2xs group flex items-start justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center space-x-2.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {report.scholarshipName}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 font-bold shrink-0">
                        {report.auditScore ? `${report.auditScore}/100` : report.overallStatus}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      <span>&bull;</span>
                      <span>{report.sourcesAnalyzed.length} official source(s)</span>
                      <span>&bull;</span>
                      <span className={report.conflicts.length > 0 ? 'text-rose-600 font-bold' : ''}>
                        {report.conflicts.length} conflict(s)
                      </span>
                      <span>&bull;</span>
                      <span className="text-amber-700 font-semibold">
                        {report.verificationQueue.length} verify item(s)
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                      &ldquo;{report.finalRecommendation}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 pt-1">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, report.id)}
                      disabled={deletingId === report.id}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
