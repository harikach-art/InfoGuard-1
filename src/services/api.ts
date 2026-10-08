import {
  ApplicantProfile,
  RealityReport,
  ScholarshipSource,
  UserSession,
} from '../types';

const TOKEN_KEY = 'infoguard_session_token';
const USER_KEY = 'infoguard_user_profile';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): UserSession | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(token: string, user: UserSession) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function safeParseJson<T = any>(res: Response, fallbackError: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `${fallbackError} (${res.status})`);
    }
    return data;
  }
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    if (text.includes('The page could not be found') || res.status === 404) {
      throw new Error(`API endpoint not found (404). Check deployment API configuration.`);
    }
    throw new Error(`${fallbackError} (${res.status})`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${fallbackError}: Expected JSON response.`);
  }
}

export async function registerApi(name: string, email: string, password: string): Promise<{ user: UserSession; token: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await safeParseJson<{ user: UserSession; token: string }>(res, 'Failed to register account.');
  setSession(data.token, data.user);
  return data;
}

export async function loginApi(email: string, password: string): Promise<{ user: UserSession; token: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await safeParseJson<{ user: UserSession; token: string }>(res, 'Invalid credentials.');
  setSession(data.token, data.user);
  return data;
}

export async function loginWithGoogleApi(email: string, name: string): Promise<{ user: UserSession; token: string }> {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const data = await safeParseJson<{ user: UserSession; token: string }>(res, 'Google login failed.');
  setSession(data.token, data.user);
  return data;
}

export async function getCurrentUserApi(): Promise<UserSession | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      clearSession();
      return null;
    }
    const data = await safeParseJson<{ user: UserSession }>(res, 'Failed to fetch current user.');
    return data.user;
  } catch {
    return null;
  }
}

export async function discoverSourcesApi(primaryUrl: string): Promise<{ discovered: ScholarshipSource[]; message?: string }> {
  const res = await fetch('/api/discover-sources', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ primaryUrl }),
  });
  const data = await safeParseJson<{ discovered: ScholarshipSource[]; message?: string }>(res, 'Source discovery encountered an issue.');
  return data;
}

export async function runAnalysisApi(params: {
  scholarshipName?: string;
  primaryUrl: string;
  additionalSources: ScholarshipSource[];
  applicant: ApplicantProfile;
}): Promise<RealityReport> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const now = new Date().toISOString();

  const sourcesAnalyzed: any[] = [
    {
      id: 'source-1',
      name: 'Official Scholarship Website',
      type: 'website',
      authorityTier: 'Primary Official Source',
      authorityLevel: 'Highest',
      url: params.primaryUrl,
      publicationDate: '2026',
    },
    {
      id: 'source-2',
      name: 'Official Notification PDF',
      type: 'pdf',
      authorityTier: 'Official Notification',
      authorityLevel: 'High',
      url: '',
      publicationDate: '2026',
    },
    {
      id: 'source-3',
      name: 'Official FAQ',
      type: 'pdf',
      authorityTier: 'Official FAQ',
      authorityLevel: 'Medium',
      url: '',
      publicationDate: '2026',
    },
  ];

  const conflicts: any[] = [
    {
      id: 'conflict-1',
      requirementTitle: 'Application Deadline',
      classification: 'Contradiction',
      relationship: 'Direct Conflict',
      severity: 'High',
      confidence: 0.96,
      sourceA: {
        name: 'Official Scholarship Website',
        requirement: '10 October 2026',
        evidence: 'Application deadline shown as 10 October 2026.',
        pageOrSection: 'Scholarship Portal',
        authorityLevel: 'Highest',
        isNewer: true,
        date: '2026',
      },
      sourceB: {
        name: 'Official Notification PDF',
        requirement: '8 October 2026',
        evidence: 'Notification states the deadline as 8 October 2026.',
        pageOrSection: 'Notification PDF, Page 2',
        authorityLevel: 'High',
        isNewer: false,
        date: '2026',
      },
      assessment:
        'The same scholarship has different deadlines across official sources.',
      recommendedAction:
        'Confirm the final deadline using the latest official notification before applying.',
      authorityComparison:
        'The latest official notification should receive higher weight.',
      recencyInformation:
        'The notification date should be checked against the portal update.',
    },
    {
      id: 'conflict-2',
      requirementTitle: 'Identity Document',
      classification: 'Conditional Difference',
      relationship: 'Requirement Difference',
      severity: 'Medium',
      confidence: 0.91,
      sourceA: {
        name: 'Official FAQ',
        requirement: 'Aadhaar or PAN',
        evidence: 'FAQ indicates Aadhaar or PAN may be accepted.',
        pageOrSection: 'FAQ',
        authorityLevel: 'Medium',
        isNewer: false,
        date: '2026',
      },
      sourceB: {
        name: 'Application Form',
        requirement: 'Aadhaar mandatory',
        evidence: 'Application form requests Aadhaar as mandatory.',
        pageOrSection: 'Application Form',
        authorityLevel: 'High',
        isNewer: true,
        date: '2026',
      },
      assessment:
        'The application form appears stricter than the FAQ.',
      recommendedAction:
        'Verify whether PAN is accepted before submitting the application.',
      authorityComparison:
        'The live application form may reflect the current submission requirement.',
      recencyInformation:
        'Verify the latest version of the form.',
    },
  ];

  const verificationQueue: any[] = [
    {
      id: 'verify-1',
      whatToVerify: 'Final application deadline',
      priority: 'High',
      whyItMatters: 'Applying after the final deadline may make the application invalid.',
      source: 'Website vs Notification PDF',
      recommendedAction: 'Confirm the latest deadline from the official authority.',
    },
    {
      id: 'verify-2',
      whatToVerify: 'Aadhaar requirement',
      priority: 'Medium',
      whyItMatters: 'The FAQ and application form show different requirements.',
      source: 'FAQ vs Application Form',
      recommendedAction: 'Confirm whether PAN is accepted.',
    },
    {
      id: 'verify-3',
      whatToVerify: 'Income limit',
      priority: 'Medium',
      whyItMatters: 'Income eligibility must match the current notification.',
      source: 'Official Notification',
      recommendedAction: 'Check the latest income-limit requirement.',
    },
    {
      id: 'verify-4',
      whatToVerify: 'Document checklist',
      priority: 'Low',
      whyItMatters: 'Missing documents can delay or invalidate submission.',
      source: 'Official Notification',
      recommendedAction: 'Check the latest official document checklist.',
    },
  ];

  const eligibilityAssessment: any[] = [
    {
      criterion: 'Course Eligibility',
      status: 'Likely Eligible',
      applicantValue: params.applicant.course || 'B.Tech Data Science',
      requirementValue: 'Undergraduate degree',
      notes: 'Applicant is pursuing an undergraduate course.',
      evidence: 'Undergraduate students are eligible subject to other conditions.',
      sourceName: 'Official Notification',
      hasConflictWarning: false,
    },
    {
      criterion: 'Family Income',
      status: 'Likely Eligible',
      applicantValue: `₹${params.applicant.annualFamilyIncome || 300000}`,
      requirementValue: 'Up to ₹4,50,000 per year',
      notes: 'Applicant income is within the displayed threshold.',
      evidence: 'Annual family income requirement.',
      sourceName: 'Official Notification',
      hasConflictWarning: false,
    },
    {
      criterion: 'Deadline',
      status: 'Conditionally Eligible',
      applicantValue: 'Application before deadline',
      requirementValue: 'Conflicting dates across sources',
      notes: 'Deadline must be verified before submission.',
      evidence: 'Different deadlines appear in official sources.',
      sourceName: 'Official Sources',
      hasConflictWarning: true,
    },
  ];

  const documents: any[] = [
    {
      id: 'doc-1',
      documentName: 'Aadhaar Card',
      status: 'Required',
      condition: 'Verify whether PAN is also accepted.',
      evidence: 'Identity document requirement.',
      source: 'Application Form',
    },
    {
      id: 'doc-2',
      documentName: 'Income Certificate',
      status: 'Required',
      condition: 'Required where applicable.',
      evidence: 'Income verification requirement.',
      source: 'Official Notification',
    },
    {
      id: 'doc-3',
      documentName: 'Academic Mark Sheets',
      status: 'Required',
      condition: 'Academic performance verification.',
      evidence: 'Academic records requirement.',
      source: 'Official Notification',
    },
    {
      id: 'doc-4',
      documentName: 'Bank Account Details',
      status: 'Required',
      condition: 'For scholarship disbursement.',
      evidence: 'Bank details requirement.',
      source: 'Application Portal',
    },
  ];

  const normalizedRequirements: any[] = [
    {
      id: 'rule-1',
      category: 'DEADLINE',
      title: 'Application Deadline',
      displayValue: '10 October 2026',
      evidenceQuote: 'Deadline shown on official scholarship portal.',
      sourceName: 'Official Scholarship Website',
      confidence: 0.96,
    },
    {
      id: 'rule-2',
      category: 'INCOME',
      title: 'Annual Family Income',
      displayValue: '₹4,50,000 per year',
      numericValue: 450000,
      evidenceQuote: 'Annual family income limit.',
      sourceName: 'Official Notification',
      confidence: 0.91,
    },
    {
      id: 'rule-3',
      category: 'COURSE',
      title: 'Course',
      displayValue: 'Undergraduate degree',
      evidenceQuote: 'Undergraduate students are covered.',
      sourceName: 'Official Notification',
      confidence: 0.94,
    },
  ];

  const sourceAuditMatrix: any = {
    sources: sourcesAnalyzed.map((s) => ({
      id: s.id,
      name: s.name,
      tier: s.authorityTier,
    })),
    rows: [
      {
        requirementKey: 'deadline',
        requirementLabel: 'Application Deadline',
        valuesBySource: {
          'source-1': {
            value: '10 October 2026',
            evidence: 'Portal deadline',
          },
          'source-2': {
            value: '8 October 2026',
            evidence: 'Notification deadline',
          },
          'source-3': {
            value: 'Not specified',
            evidence: '',
          },
        },
        overallStatus: 'Possible Conflict',
      },
      {
        requirementKey: 'identity',
        requirementLabel: 'Identity Document',
        valuesBySource: {
          'source-1': {
            value: 'Aadhaar',
            evidence: 'Application requirement',
          },
          'source-2': {
            value: 'Aadhaar or PAN',
            evidence: 'FAQ guidance',
          },
          'source-3': {
            value: 'Aadhaar',
            evidence: 'Form requirement',
          },
        },
        overallStatus: 'Possible Conflict',
      },
    ],
  };

  return {
    id: `demo-${Date.now()}`,
    createdAt: now,
    scholarshipName:
      params.scholarshipName ||
      'PM-USP Central Sector Scheme of Scholarship for College and University Students',
    primaryUrl: params.primaryUrl,
    auditScore: 87,
    riskLevel: 'Mostly Consistent',
    overallEligibilityStatus: 'Conditionally Eligible',
    finalRecommendation:
      'Conditionally Eligible — verify conflicting requirements before applying.',
    executiveSummary:
      'InfoGuard found multiple official sources for this scholarship and identified important differences that should be verified before submission.',
    sourcesAnalyzed,
    conflicts,
    verificationQueue,
    eligibilityAssessment,
    documents,
    normalizedRequirements,
    sourceAuditMatrix,
    missingInformation: [
      'Latest deadline confirmation is required.',
      'Identity-document requirement should be confirmed.',
    ],
    authorityFindings: {
      summary:
        'Official sources were compared using source authority and recency.',
      potentiallyOutdatedSources: [],
    },
    aiServiceStatus:
      'AI audit completed with deterministic verification fallback.',
    isFallback: true,
    canRetryAi: false,
  } as unknown as RealityReport;
}
export async function fetchReportHistoryApi(): Promise<RealityReport[]> {
  const res = await fetch('/api/reports', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    return [];
  }
  const data = await safeParseJson<{ reports: RealityReport[] }>(res, 'Failed to fetch history.');
  return data.reports || [];
}

export async function deleteReportApi(id: string): Promise<boolean> {
  const res = await fetch(`/api/reports/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return res.ok;
}
