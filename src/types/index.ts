export type SourceType =
  | 'portal'
  | 'notification'
  | 'webpage'
  | 'faq'
  | 'form'
  | 'circular'
  | 'archived';

export type AuthorityTier =
  | 'Current Official Application Portal'
  | 'Official Issued Notification'
  | 'Official Scholarship Webpage'
  | 'Official FAQ / Help Page'
  | 'Official Application Form / Circular'
  | 'Archived or Undated Material';

export interface ScholarshipSource {
  id: string;
  name: string;
  url?: string;
  type: SourceType;
  authorityTier: AuthorityTier;
  publicationDate?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  fileBase64?: string;
  isDiscovered?: boolean;
  domain?: string;
  contentSnippet?: string;
  notes?: string;
}

export interface ApplicantProfile {
  name: string;
  age?: number;
  dob?: string;
  course: string;
  yearOfStudy: string;
  institution: string;
  category: string; // e.g. General, OBC, SC, ST, EWS, Minority
  annualFamilyIncome: number;
  currency: string;
  state: string; // State / Domicile Location
  gender: string;
  academicPercentage?: number; // % or CGPA
  specialAttributes: string[]; // e.g. First Generation Graduate, Single Girl Child, Disability (PwD)
}

export type RequirementCategory =
  | 'deadline'
  | 'income_limit'
  | 'age_limit'
  | 'course'
  | 'year_of_study'
  | 'category'
  | 'academic_percentage'
  | 'domicile'
  | 'gender'
  | 'documents'
  | 'fees'
  | 'instructions'
  | 'other_conditions';

export interface NormalizedRequirement {
  id: string;
  category: RequirementCategory;
  title: string;
  operator?: '<=' | '>=' | '==' | '!=' | 'in' | 'not_in' | 'range' | 'text' | 'boolean';
  numericValue?: number;
  dateValue?: string;
  displayValue: string;
  conditionText?: string;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  evidenceQuote: string;
  pageOrSection?: string;
  publicationDate?: string;
  confidence: number;
  authorityTier: AuthorityTier;
}

export type ConflictClassification =
  | 'Contradiction'
  | 'Conditional Difference'
  | 'Missing Information'
  | 'Potentially Outdated'
  | 'Appears Updated'
  | 'Ambiguous'
  | 'Cannot Determine';

export type ConflictRelationship =
  | 'MATCH'
  | 'CONDITIONAL MATCH'
  | 'CONFLICT'
  | 'OMITTED'
  | 'AMBIGUOUS'
  | 'OUTDATED'
  | 'UNVERIFIABLE';

export interface ConflictItem {
  id: string;
  requirementCategory: string;
  requirementTitle: string;
  classification: ConflictClassification;
  relationship: ConflictRelationship;
  severity: 'High' | 'Medium' | 'Low';
  sourceA: {
    sourceId: string;
    name: string;
    type: string;
    requirement: string;
    date?: string;
    evidence: string;
    pageOrSection?: string;
    authorityLevel?: string;
    isNewer?: boolean;
  };
  sourceB: {
    sourceId: string;
    name: string;
    type: string;
    requirement: string;
    date?: string;
    evidence: string;
    pageOrSection?: string;
    authorityLevel?: string;
    isNewer?: boolean;
  };
  authorityComparison?: string;
  recencyInformation?: string;
  assessment: string;
  confidence: number;
  recommendedAction: string;
}

export type EligibilityStatus =
  | 'Likely Eligible'
  | 'Ineligible'
  | 'Conditionally Eligible'
  | 'Eligible but Incomplete'
  | 'Cannot Verify';

export interface EligibilityCriterionResult {
  criterion: string;
  category: RequirementCategory;
  applicantValue: string;
  requirementValue: string;
  status: EligibilityStatus;
  confidence: number;
  evidence: string;
  sourceName: string;
  notes: string;
  hasConflictWarning?: boolean;
}

export type DocumentRequirementStatus =
  | 'Required'
  | 'Conditionally Required'
  | 'Possibly Required'
  | 'Cannot Verify';

export interface DocumentRequirementItem {
  id: string;
  documentName: string;
  status: DocumentRequirementStatus;
  condition?: string;
  source: string;
  evidence: string;
  notes?: string;
}

export type VerificationStatus =
  | 'Confirmed'
  | 'Needs Verification'
  | 'Conflict Detected'
  | 'Potentially Outdated'
  | 'Cannot Verify';

export interface VerificationQueueItem {
  id: string;
  whatToVerify: string;
  whyItMatters: string;
  source: string;
  evidence?: string;
  priority: 'High' | 'Medium' | 'Low';
  status: VerificationStatus;
  recommendedAction: string;
}

export interface SourceAuditCell {
  value: string;
  evidence?: string;
  date?: string;
  statusTag?: string;
  pageOrSection?: string;
}

export interface SourceAuditRow {
  requirementKey: string;
  requirementLabel: string;
  valuesBySource: Record<string, SourceAuditCell>;
  comparison?: string;
  evidenceSummary?: string;
  overallStatus:
    | 'Consistent'
    | 'Possible Conflict'
    | 'Requires Verification'
    | 'Conditional Difference'
    | 'Potentially Outdated'
    | 'Missing in Some Sources'
    | 'Cannot Determine';
}

export interface RealityReport {
  id: string;
  createdAt: string;
  scholarshipName: string;
  primaryUrl: string;
  overallStatus:
    | 'Consistent — Verified'
    | 'Requires Verification'
    | 'Critical Conflicts Found'
    | 'Ineligible Based on Evidence'
    | 'Incomplete Official Data';
  executiveSummary: string;
  sourcesAnalyzed: ScholarshipSource[];
  normalizedRequirements: NormalizedRequirement[];
  sourceAuditMatrix: {
    sources: { id: string; name: string; type: SourceType; tier: AuthorityTier }[];
    rows: SourceAuditRow[];
  };
  conflicts: ConflictItem[];
  missingInformation: string[];
  eligibilityAssessment: EligibilityCriterionResult[];
  overallEligibilityStatus: EligibilityStatus;
  documents: DocumentRequirementItem[];
  verificationQueue: VerificationQueueItem[];
  finalRecommendation: string;
  auditScore?: number;
  riskLevel?: 'Mostly Consistent' | 'Needs Verification' | 'High Risk';
  scoreExplanation?: string;
  isFallback?: boolean;
  aiServiceStatus?: string;
  canRetryAi?: boolean;
  isDemo?: boolean;
  authorityFindings: {
    mostAuthoritativeSource?: string;
    potentiallyOutdatedSources: string[];
    summary: string;
  };
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AnalysisProgressStep {
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}
