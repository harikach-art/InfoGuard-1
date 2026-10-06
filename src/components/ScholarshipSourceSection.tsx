import React, { useState } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  Upload,
  FileText,
  Search,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  HelpCircle,
  Laptop,
  Scroll,
  FileCheck,
  FileSpreadsheet,
  X,
  Compass,
} from 'lucide-react';
import { ScholarshipSource, SourceType, AuthorityTier } from '../types';
import { discoverSourcesApi } from '../services/api';

interface ScholarshipSourceSectionProps {
  scholarshipName: string;
  setScholarshipName: (name: string) => void;
  primaryUrl: string;
  setPrimaryUrl: (url: string) => void;
  additionalSources: ScholarshipSource[];
  setAdditionalSources: React.Dispatch<React.SetStateAction<ScholarshipSource[]>>;
  discoveredSources: ScholarshipSource[];
  setDiscoveredSources: React.Dispatch<React.SetStateAction<ScholarshipSource[]>>;
}

// Visual icons helper based on source type
export const getSourceTypeIcon = (type: SourceType, sizeClass = 'w-4 h-4') => {
  switch (type) {
    case 'portal':
      return <Laptop className={`${sizeClass} text-indigo-500`} />;
    case 'notification':
      return <FileText className={`${sizeClass} text-rose-500`} />;
    case 'circular':
      return <Scroll className={`${sizeClass} text-purple-500`} />;
    case 'faq':
      return <HelpCircle className={`${sizeClass} text-amber-500`} />;
    case 'form':
      return <FileCheck className={`${sizeClass} text-emerald-500`} />;
    case 'webpage':
    default:
      return <Globe className={`${sizeClass} text-blue-500`} />;
  }
};

export const getSourceTypeBadge = (type: SourceType) => {
  switch (type) {
    case 'portal':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'notification':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'circular':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'faq':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'form':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'webpage':
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
};

export const ScholarshipSourceSection: React.FC<ScholarshipSourceSectionProps> = ({
  scholarshipName,
  setScholarshipName,
  primaryUrl,
  setPrimaryUrl,
  additionalSources,
  setAdditionalSources,
  discoveredSources,
  setDiscoveredSources,
}) => {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);

  // Form state for adding an additional URL
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<SourceType>('notification');
  const [isAddingSource, setIsAddingSource] = useState(false);

  // Automatic source discovery handler
  const handleDiscover = async () => {
    if (!primaryUrl.trim()) return;
    setIsDiscovering(true);
    setDiscoveryMessage(null);

    try {
      const res = await discoverSourcesApi(primaryUrl);
      setDiscoveredSources(res.discovered);
      if (res.message) {
        setDiscoveryMessage(res.message);
      } else if (res.discovered.length === 0) {
        setDiscoveryMessage(
          'No additional official sources could be confidently identified. You can add official sources manually.'
        );
      }
    } catch (err: any) {
      setDiscoveryMessage(
        err.message ||
          'No additional official sources could be confidently identified. You can add official sources manually.'
      );
    } finally {
      setIsDiscovering(false);
    }
  };

  // Add source manually
  const handleAddManualSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    let tier: AuthorityTier = 'Official Issued Notification';
    if (newType === 'portal') tier = 'Current Official Application Portal';
    else if (newType === 'faq') tier = 'Official FAQ / Help Page';
    else if (newType === 'webpage') tier = 'Official Scholarship Webpage';
    else if (newType === 'circular' || newType === 'form')
      tier = 'Official Application Form / Circular';

    const source: ScholarshipSource = {
      id: `manual-${Date.now()}`,
      name: newName.trim() || `${newType.toUpperCase()} Source`,
      url: newUrl.trim(),
      type: newType,
      authorityTier: tier,
    };

    setAdditionalSources((prev) => [...prev, source]);
    setNewUrl('');
    setNewName('');
    setIsAddingSource(false);
  };

  // Add a discovered source into additionalSources
  const handleIncludeDiscovered = (source: ScholarshipSource) => {
    setAdditionalSources((prev) => [...prev, source]);
    setDiscoveredSources((prev) => prev.filter((s) => s.id !== source.id));
  };

  // Remove a source
  const handleRemoveSource = (id: string) => {
    setAdditionalSources((prev) => prev.filter((s) => s.id !== id));
  };

  // Document file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isDoc =
        file.name.endsWith('.docx') || file.name.endsWith('.doc') || file.name.endsWith('.txt');

      if (!isPdf && !isDoc) {
        alert('Please upload an official PDF, DOCX, or text circular.');
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        alert('File size exceeds the 15MB limit.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;

        const newDocSource: ScholarshipSource = {
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type: 'notification',
          authorityTier: 'Official Issued Notification',
          fileName: file.name,
          fileSize: file.size,
          fileMimeType: file.type || 'application/pdf',
          fileBase64: base64,
          notes: `Uploaded document (${Math.round(file.size / 1024)} KB)`,
        };

        setAdditionalSources((prev) => [...prev, newDocSource]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] space-y-6">
      {/* Section Header with Step Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            01
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Official Scholarship Sources</span>
            </h2>
            <p className="text-xs text-slate-500">
              Provide the official scheme website, gazette circular, or notification PDF to cross-audit.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          <span>Authoritative portals only</span>
        </div>
      </div>

      {/* Primary Scholarship Input Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Scholarship Name (Optional) */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-colors">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Scholarship Name <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={scholarshipName}
            onChange={(e) => setScholarshipName(e.target.value)}
            placeholder="e.g. National Merit Scholarship Scheme"
            className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
          <p className="text-[10px] text-slate-400 mt-1.5">
            Auto-detected if left empty
          </p>
        </div>

        {/* Primary Official URL (Required) */}
        <div className="lg:col-span-8 p-4 rounded-xl bg-gradient-to-br from-indigo-50/40 via-white to-slate-50/70 border border-indigo-100 hover:border-indigo-300 transition-all shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span>Main Official Scholarship Website</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            {primaryUrl && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Validated Source
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="url"
              required
              value={primaryUrl}
              onChange={(e) => setPrimaryUrl(e.target.value)}
              placeholder="https://scholarships.gov.in/official-scheme-portal"
              className="w-full px-3.5 py-2 text-xs font-medium text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-mono"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
            <span>Primary official domain to anchor cross-source conflict detection.</span>
          </p>
        </div>
      </div>

      {/* Automatic Source Discovery Banner Card */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute right-0 top-0 w-64 h-32 bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-400">
              <Compass className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              AI Official Source Discovery
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Scan the official provider domain for linked government circulars, PDF notifications, portal URLs, and FAQs. Third-party blogs and aggregators are automatically discarded.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDiscover}
          disabled={!primaryUrl.trim() || isDiscovering}
          className="shrink-0 inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 disabled:opacity-40 disabled:hover:bg-indigo-600 z-10"
        >
          {isDiscovering ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              <span>Scanning official domain...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              <span>Discover Official Sources</span>
            </>
          )}
        </button>
      </div>

      {/* Discovery Message if any */}
      {discoveryMessage && (
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{discoveryMessage}</span>
        </div>
      )}

      {/* Discovered Sources Review Shelf */}
      {discoveredSources.length > 0 && (
        <div className="p-4 sm:p-5 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Discovered Official Sources ({discoveredSources.length})
              </span>
            </div>
            <span className="text-[11px] text-slate-500">Select to add to audit</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {discoveredSources.map((source) => (
              <div
                key={source.id}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
                    {getSourceTypeIcon(source.type)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-900 block truncate">
                      {source.name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate block">
                      {source.url}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleIncludeDiscovered(source)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDiscoveredSources((prev) => prev.filter((s) => s.id !== source.id))
                    }
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Included Sources & Documents Grid */}
      {additionalSources.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span>Active Audit Sources ({additionalSources.length + 1})</span>
            </label>
            <span className="text-[11px] text-slate-400">Comparing across these documents</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {additionalSources.map((source) => (
              <div
                key={source.id}
                className="p-3.5 rounded-xl border border-slate-200/90 bg-white flex items-center justify-between gap-3 shadow-2xs hover:shadow-sm transition-all group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0">
                    {getSourceTypeIcon(source.type, 'w-4 h-4')}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {source.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold border uppercase ${getSourceTypeBadge(
                          source.type
                        )}`}
                      >
                        {source.type}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                      {source.fileName ? `Uploaded: ${source.fileName}` : source.url}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSource(source.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                  title="Remove from audit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions: Document Upload & Add URL */}
      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Upload Card */}
        <label className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-xl p-4 flex items-center justify-center space-x-3 text-xs font-semibold text-slate-700 transition-all group shadow-2xs">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-slate-900">Upload Official Circular / PDF</span>
            <span className="text-[10px] text-slate-400 font-normal">PDF, DOCX, or Gazette Notice (Max 15MB)</span>
          </div>
          <input
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {/* Add Official URL Button */}
        <button
          type="button"
          onClick={() => setIsAddingSource(!isAddingSource)}
          className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl p-4 flex items-center justify-center space-x-3 text-xs font-semibold text-slate-700 transition-all shadow-2xs"
        >
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <Plus className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="block text-slate-900">Add Additional Official URL</span>
            <span className="text-[10px] text-slate-400 font-normal">Official Portal, Circular, or FAQ link</span>
          </div>
        </button>
      </div>

      {/* Manual URL Form Drawer */}
      {isAddingSource && (
        <form
          onSubmit={handleAddManualSource}
          className="p-5 rounded-xl border border-indigo-100 bg-slate-50/80 space-y-3.5 transition-all"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Add Official Source Link
            </span>
            <button
              type="button"
              onClick={() => setIsAddingSource(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Source Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as SourceType)}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              >
                <option value="notification">Official Notification / Circular</option>
                <option value="portal">Current Application Portal</option>
                <option value="webpage">Official Scholarship Webpage</option>
                <option value="faq">Official FAQ / Help Page</option>
                <option value="form">Application Instructions Form</option>
                <option value="circular">Government Circular / Gazette</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Source Title
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Official Gazette Circular 2026"
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Official URL <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                required
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors shadow-xs"
            >
              Add to Audit
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
