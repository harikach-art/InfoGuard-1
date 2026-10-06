import React, { useState, useEffect } from 'react';
import {
  ApplicantProfile,
  RealityReport,
  ScholarshipSource,
  UserSession,
} from './types';
import {
  clearSession,
  fetchReportHistoryApi,
  getCurrentUserApi,
  getStoredUser,
  runAnalysisApi,
} from './services/api';
import { BrandIntro } from './components/BrandIntro';
import { AuthModal } from './components/AuthModal';
import { Header } from './components/Header';
import { ScholarshipSourceSection } from './components/ScholarshipSourceSection';
import { ApplicantDetailsSection } from './components/ApplicantDetailsSection';
import { RunAuditBar } from './components/RunAuditBar';
import { AnalysisPipelineModal, PIPELINE_STAGES } from './components/AnalysisPipelineModal';
import { RealityReportView } from './components/RealityReportView';
import { ReportHistoryModal } from './components/ReportHistoryModal';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<UserSession | null>(getStoredUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');

  // Audit Form state
  const [scholarshipName, setScholarshipName] = useState('');
  const [primaryUrl, setPrimaryUrl] = useState('');
  const [additionalSources, setAdditionalSources] = useState<ScholarshipSource[]>([]);
  const [discoveredSources, setDiscoveredSources] = useState<ScholarshipSource[]>([]);

  // Applicant Profile state (starts empty/unfilled per strict requirement: NO DEMO DATA)
  const [applicant, setApplicant] = useState<ApplicantProfile>({
    name: '',
    course: '',
    yearOfStudy: '1st Year (Fresh / New Admission)',
    institution: '',
    category: 'General',
    annualFamilyIncome: 0,
    currency: '₹',
    state: '',
    gender: 'Male',
    academicPercentage: undefined,
    age: undefined,
    specialAttributes: [],
  });

  // Analysis pipeline & report state
  const [isAuditing, setIsAuditing] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<RealityReport | null>(null);

  // History state
  const [historyReports, setHistoryReports] = useState<RealityReport[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Check current user session on mount
  useEffect(() => {
    getCurrentUserApi().then((user) => {
      if (user) {
        setCurrentUser(user);
        loadHistory();
      }
    });
  }, []);

  const loadHistory = async () => {
    try {
      const reports = await fetchReportHistoryApi();
      setHistoryReports(reports);
    } catch (err) {
      console.warn('Failed loading reports history:', err);
    }
  };

  const handleSignOut = () => {
    clearSession();
    setCurrentUser(null);
    setActiveReport(null);
    setHistoryReports([]);
  };

  const handleAuthSuccess = (user: UserSession) => {
    setCurrentUser(user);
    setAuthModalOpen(false);
    loadHistory();
  };

  const handleNewAnalysis = () => {
    setActiveReport(null);
    setScholarshipName('');
    setPrimaryUrl('');
    setAdditionalSources([]);
    setDiscoveredSources([]);
  };

  // Run the real InfoGuard audit pipeline
  const handleRunAudit = async () => {
    setIsAuditing(true);
    setAuditError(null);
    setCurrentStageIndex(0);

    // Realistic progress animation through actual stages
    const timer = setInterval(() => {
      setCurrentStageIndex((prev) => {
        if (prev < PIPELINE_STAGES.length - 2) {
          return prev + 1;
        }
        return prev;
      });
    }, 1100);

    try {
      const report = await runAnalysisApi({
        scholarshipName: scholarshipName.trim() || undefined,
        primaryUrl: primaryUrl.trim(),
        additionalSources,
        applicant,
      });

      clearInterval(timer);
      setCurrentStageIndex(PIPELINE_STAGES.length - 1);
      setTimeout(() => {
        setIsAuditing(false);
        setActiveReport(report);
        loadHistory();
      }, 500);
    } catch (err: any) {
      clearInterval(timer);
      setAuditError(
        err.message ||
          'Analysis failed. Ensure the official source URLs are valid and reachable or upload official circular PDFs directly.'
      );
    }
  };

  // If user is not signed in, show Screen 1: Clean Brand Introduction
  if (!currentUser) {
    return (
      <>
        <BrandIntro
          onOpenSignUp={() => {
            setAuthModalMode('signup');
            setAuthModalOpen(true);
          }}
          onOpenSignIn={() => {
            setAuthModalMode('signin');
            setAuthModalOpen(true);
          }}
        />

        <AuthModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white relative font-sans">
      {/* Ambient gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.08),rgba(255,255,255,0))] pointer-events-none -z-10" />

      {/* Workspace Header */}
      <Header
        user={currentUser}
        historyCount={historyReports.length}
        onNewAnalysis={handleNewAnalysis}
        onOpenHistory={() => setHistoryModalOpen(true)}
        onSignOut={handleSignOut}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {activeReport ? (
          /* Active Reality Report View */
          <RealityReportView
            report={activeReport}
            onBackToWorkspace={() => setActiveReport(null)}
          />
        ) : (
          /* Main InfoGuard Workspace */
          <div className="space-y-8">
            {/* Workspace Heading */}
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <span>Active Conflict Workspace</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Check a scholarship before you apply.
              </h1>
              <p className="text-sm sm:text-base text-slate-600 font-normal max-w-2xl">
                InfoGuard cross-references official portals, circulars, and notifications to flag contradictions and show you what needs verification before applying.
              </p>
            </div>

            {/* Step 1: Scholarship Sources */}
            <ScholarshipSourceSection
              scholarshipName={scholarshipName}
              setScholarshipName={setScholarshipName}
              primaryUrl={primaryUrl}
              setPrimaryUrl={setPrimaryUrl}
              additionalSources={additionalSources}
              setAdditionalSources={setAdditionalSources}
              discoveredSources={discoveredSources}
              setDiscoveredSources={setDiscoveredSources}
            />

            {/* Step 2: Applicant Details */}
            <ApplicantDetailsSection
              applicant={applicant}
              setApplicant={setApplicant}
            />

            {/* Step 3: Run InfoGuard Action & Validation Bar */}
            <RunAuditBar
              primaryUrl={primaryUrl}
              additionalSources={additionalSources}
              applicant={applicant}
              onRunAudit={handleRunAudit}
              isRunning={isAuditing}
            />
          </div>
        )}
      </main>

      {/* Analysis Pipeline Progress Modal */}
      {isAuditing && (
        <AnalysisPipelineModal
          currentStageIndex={currentStageIndex}
          error={auditError}
          onDismissError={() => {
            setIsAuditing(false);
            setAuditError(null);
          }}
        />
      )}

      {/* Report History Modal */}
      <ReportHistoryModal
        isOpen={historyModalOpen}
        reports={historyReports}
        onClose={() => setHistoryModalOpen(false)}
        onSelectReport={(report) => {
          setActiveReport(report);
          setHistoryModalOpen(false);
        }}
        onRefreshReports={loadHistory}
      />
    </div>
  );
}
