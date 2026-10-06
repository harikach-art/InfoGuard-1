import React, { useState } from 'react';
import { UserCheck, Shield, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { ApplicantProfile } from '../types';

interface ApplicantDetailsSectionProps {
  applicant: ApplicantProfile;
  setApplicant: React.Dispatch<React.SetStateAction<ApplicantProfile>>;
}

const COMMON_CATEGORIES = [
  'General',
  'OBC (Non-Creamy Layer)',
  'OBC (Creamy Layer)',
  'SC (Scheduled Caste)',
  'ST (Scheduled Tribe)',
  'EWS (Economically Weaker Section)',
  'Minority (Muslim, Christian, Sikh, Buddhist, Jain, Parsi)',
];

const SPECIAL_ATTRIBUTES = [
  'First Generation Graduate',
  'Single Girl Child',
  'Person with Disability (PwD / Divyangjan)',
  'Orphan / Single Parent Child',
  'Wards of Armed Forces / Ex-Servicemen',
  'Hosteller (Living in college hostel)',
];

export const ApplicantDetailsSection: React.FC<ApplicantDetailsSectionProps> = ({
  applicant,
  setApplicant,
}) => {
  const [showSpecialAttrs, setShowSpecialAttrs] = useState(false);

  const toggleAttribute = (attr: string) => {
    setApplicant((prev) => {
      const exists = prev.specialAttributes.includes(attr);
      return {
        ...prev,
        specialAttributes: exists
          ? prev.specialAttributes.filter((a) => a !== attr)
          : [...prev.specialAttributes, attr],
      };
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] space-y-6">
      {/* Header with Step Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            02
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Applicant Profile & Qualifications</span>
            </h2>
            <p className="text-xs text-slate-500">
              Deterministic criteria cross-check: your profile is tested against official requirements without external sharing.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Client-side verification</span>
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Full Name */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Applicant Full Name <span className="text-rose-500 font-bold">*</span>
          </label>
          <input
            type="text"
            required
            value={applicant.name}
            onChange={(e) => setApplicant((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Priyanshu Sharma"
            className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Course / Program */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Degree / Course Program <span className="text-rose-500 font-bold">*</span>
          </label>
          <input
            type="text"
            required
            value={applicant.course}
            onChange={(e) => setApplicant((prev) => ({ ...prev, course: e.target.value }))}
            placeholder="e.g. B.Tech Computer Science, MBBS, B.Com"
            className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Year of study */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Year of Study
          </label>
          <select
            value={applicant.yearOfStudy}
            onChange={(e) => setApplicant((prev) => ({ ...prev, yearOfStudy: e.target.value }))}
            className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="1st Year (Fresh / New Admission)">1st Year (Fresh / New Admission)</option>
            <option value="2nd Year (Continuing / Renewal)">2nd Year (Continuing / Renewal)</option>
            <option value="3rd Year (Continuing / Renewal)">3rd Year (Continuing / Renewal)</option>
            <option value="4th Year (Continuing / Renewal)">4th Year (Continuing / Renewal)</option>
            <option value="Postgraduate (1st Year)">Postgraduate (1st Year)</option>
            <option value="Postgraduate (2nd Year)">Postgraduate (2nd Year)</option>
            <option value="Ph.D. / Research Scholar">Ph.D. / Research Scholar</option>
          </select>
        </div>

        {/* Annual Family Income */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Annual Family Income <span className="text-rose-500 font-bold">*</span>
            </label>
            <span className="text-[10px] text-slate-400">As per official certificate</span>
          </div>
          <div className="relative flex rounded-lg shadow-2xs">
            <select
              value={applicant.currency || '₹'}
              onChange={(e) => setApplicant((prev) => ({ ...prev, currency: e.target.value }))}
              className="px-2.5 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-700 text-xs font-bold focus:outline-none"
            >
              <option value="₹">₹ INR</option>
              <option value="$">$ USD</option>
              <option value="€">€ EUR</option>
            </select>
            <input
              type="number"
              min="0"
              step="5000"
              required
              value={applicant.annualFamilyIncome || ''}
              onChange={(e) =>
                setApplicant((prev) => ({
                  ...prev,
                  annualFamilyIncome: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="e.g. 180000"
              className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-200 rounded-r-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Social Category */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Social Category / Quota
          </label>
          <select
            value={applicant.category}
            onChange={(e) => setApplicant((prev) => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            {COMMON_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* State / Domicile Location */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            State / Domicile Location
          </label>
          <input
            type="text"
            value={applicant.state}
            onChange={(e) => setApplicant((prev) => ({ ...prev, state: e.target.value }))}
            placeholder="e.g. Maharashtra, Karnataka, Delhi"
            className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Academic percentage */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Academic Score / Percentage (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={applicant.academicPercentage || ''}
            onChange={(e) =>
              setApplicant((prev) => ({
                ...prev,
                academicPercentage: parseFloat(e.target.value) || undefined,
              }))
            }
            placeholder="e.g. 78.5"
            className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
          />
        </div>

        {/* Age */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Age (years)
          </label>
          <input
            type="number"
            min="10"
            max="70"
            value={applicant.age || ''}
            onChange={(e) =>
              setApplicant((prev) => ({
                ...prev,
                age: parseInt(e.target.value, 10) || undefined,
              }))
            }
            placeholder="e.g. 20"
            className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
          />
        </div>

        {/* Gender */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Gender
          </label>
          <select
            value={applicant.gender}
            onChange={(e) => setApplicant((prev) => ({ ...prev, gender: e.target.value }))}
            className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-Binary / Other">Non-Binary / Other</option>
          </select>
        </div>

        {/* Institution / College */}
        <div className="sm:col-span-2 lg:col-span-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            College / University Name
          </label>
          <input
            type="text"
            value={applicant.institution}
            onChange={(e) => setApplicant((prev) => ({ ...prev, institution: e.target.value }))}
            placeholder="e.g. Delhi Technological University, Mumbai University"
            className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Special Attributes Toggle */}
      <div className="pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowSpecialAttrs(!showSpecialAttrs)}
          className="text-xs font-bold text-slate-700 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
        >
          <Award className="w-3.5 h-3.5 text-indigo-500" />
          <span>Special reservations & scholarship attributes</span>
          {showSpecialAttrs ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {showSpecialAttrs && (
          <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {SPECIAL_ATTRIBUTES.map((attr) => {
              const checked = applicant.specialAttributes.includes(attr);
              return (
                <label
                  key={attr}
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center space-x-2.5 transition-all ${
                    checked
                      ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950 font-semibold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAttribute(attr)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{attr}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
