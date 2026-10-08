import {
  ApplicantProfile,
  AuthorityTier,
  ConflictClassification,
  ConflictItem,
  DocumentRequirementItem,
  EligibilityCriterionResult,
  EligibilityStatus,
  NormalizedRequirement,
  RealityReport,
  RequirementCategory,
  ScholarshipSource,
  SourceAuditCell,
  SourceAuditRow,
  SourceType,
  VerificationQueueItem,
} from '../types';

/**
 * Deterministic Engine for InfoGuard:
 * Executes rule-based comparison, threshold evaluations, mathematical & date logic,
 * conflict classifications, and eligibility scoring without hallucinations.
 */

// Normalizes date string to a comparable timestamp if possible
export function parseDateSafe(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  // Try matching DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

// Compare two dates deterministically
export function compareDatesDiff(dateAStr?: string, dateBStr?: string): {
  areDifferent: boolean;
  daysApart?: number;
  newerIs?: 'A' | 'B' | 'Equal';
} {
  const dA = parseDateSafe(dateAStr);
  const dB = parseDateSafe(dateBStr);
  if (!dA || !dB) {
    // If textual mismatch
    const textA = (dateAStr || '').trim().toLowerCase();
    const textB = (dateBStr || '').trim().toLowerCase();
    return {
      areDifferent: textA !== '' && textB !== '' && textA !== textB,
      daysApart: undefined,
      newerIs: undefined,
    };
  }

  const timeDiff = dA.getTime() - dB.getTime();
  const daysApart = Math.round(Math.abs(timeDiff) / (1000 * 60 * 60 * 24));
  return {
    areDifferent: daysApart > 0,
    daysApart,
    newerIs: timeDiff > 0 ? 'A' : timeDiff < 0 ? 'B' : 'Equal',
  };
}

// Format currency
export function formatCurrency(amount: number, currency = '₹'): string {
  if (currency === '₹' || currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return `${currency}${amount.toLocaleString('en-US')}`;
}

// Helper to score authority tiers for conflict assessment
export function getAuthorityTierWeight(tier?: AuthorityTier): number {
  switch (tier) {
    case 'Current Official Application Portal':
      return 100;
    case 'Official Issued Notification':
      return 90;
    case 'Official Application Form / Circular':
      return 80;
    case 'Official FAQ / Help Page':
      return 70;
    case 'Official Scholarship Webpage':
      return 60;
    case 'Archived or Undated Material':
      return 30;
    default:
      return 50;
  }
}

export function buildAuthorityComparison(srcA?: ScholarshipSource, srcB?: ScholarshipSource): string {
  if (!srcA || !srcB) return 'Cross-verified across official documentation tiers.';
  const weightA = getAuthorityTierWeight(srcA.authorityTier);
  const weightB = getAuthorityTierWeight(srcB.authorityTier);

  if (weightA > weightB) {
    return `${srcA.name} (${srcA.authorityTier}) carries higher operational authority than ${srcB.name} (${srcB.authorityTier}). Portal/Notification parameters take precedence for active submissions.`;
  }
  if (weightB > weightA) {
    return `${srcB.name} (${srcB.authorityTier}) carries higher operational authority than ${srcA.name} (${srcA.authorityTier}). Notification/Portal guidelines take precedence.`;
  }
  return `Both sources hold equal official authority level (${srcA.authorityTier || 'Official Source'}).`;
}

export function buildRecencyComparison(
  dateA?: string,
  dateB?: string,
  srcAName?: string,
  srcBName?: string
): { recencyInformation: string; newerIs?: 'A' | 'B' | 'Equal' } {
  const comp = compareDatesDiff(dateA, dateB);
  if (!comp.daysApart && !dateA && !dateB) {
    return {
      recencyInformation: 'Publication dates not explicitly stated in source metadata.',
      newerIs: undefined,
    };
  }
  if (comp.newerIs === 'A') {
    return {
      recencyInformation: `${srcAName || 'Source A'} was issued on ${dateA}${comp.daysApart ? ` (${comp.daysApart} days after ${srcBName || 'Source B'})` : ''} and appears to be the more recent release.`,
      newerIs: 'A',
    };
  }
  if (comp.newerIs === 'B') {
    return {
      recencyInformation: `${srcBName || 'Source B'} was issued on ${dateB}${comp.daysApart ? ` (${comp.daysApart} days after ${srcAName || 'Source A'})` : ''} and appears to be the more recent release.`,
      newerIs: 'B',
    };
  }
  return {
    recencyInformation: `Both official documents reference contemporaneous timelines (${dateA || dateB || 'Same period'}).`,
    newerIs: 'Equal',
  };
}

/**
 * Detect conflicts across normalized requirements from multiple sources
 */
export function detectConflictsDeterministically(
  requirements: NormalizedRequirement[],
  sources: ScholarshipSource[]
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  const sourceMap = new Map<string, ScholarshipSource>();
  sources.forEach((s) => sourceMap.set(s.id, s));

  // Group requirements by category
  const categoryGroups = new Map<RequirementCategory, NormalizedRequirement[]>();
  requirements.forEach((req) => {
    const list = categoryGroups.get(req.category) || [];
    list.push(req);
    categoryGroups.set(req.category, list);
  });

  categoryGroups.forEach((reqs, category) => {
    // We only cross-compare pairs of requirements from different sources
    for (let i = 0; i < reqs.length; i++) {
      for (let j = i + 1; j < reqs.length; j++) {
        const reqA = reqs[i];
        const reqB = reqs[j];

        // Skip if same source
        if (reqA.sourceId === reqB.sourceId) continue;

        const srcA = sourceMap.get(reqA.sourceId);
        const srcB = sourceMap.get(reqB.sourceId);

        const recencyComp = buildRecencyComparison(
          reqA.publicationDate,
          reqB.publicationDate,
          reqA.sourceName,
          reqB.sourceName
        );
        const hasAnewerDate = recencyComp.newerIs === 'A';
        const hasBnewerDate = recencyComp.newerIs === 'B';
        const authorityComp = buildAuthorityComparison(srcA, srcB);

        // 1. DEADLINE COMPARISON
        if (category === 'deadline') {
          const deadlineComp = compareDatesDiff(reqA.dateValue || reqA.displayValue, reqB.dateValue || reqB.displayValue);
          if (deadlineComp.areDifferent) {
            let classification: ConflictClassification = 'Contradiction';
            let relationship: ConflictItem['relationship'] = 'CONFLICT';
            let assessment = `Sources state conflicting application deadlines. ${reqA.sourceName} reports "${reqA.displayValue}" while ${reqB.sourceName} reports "${reqB.displayValue}".`;

            if (reqA.conditionText || reqB.conditionText) {
              classification = 'Conditional Difference';
              relationship = 'CONDITIONAL MATCH';
              assessment = `Application deadlines differ based on specific criteria or applicant phase (${reqA.conditionText || 'General'} vs ${reqB.conditionText || 'General'}).`;
            } else if (hasAnewerDate || hasBnewerDate) {
              classification = 'Appears Updated';
              relationship = 'OUTDATED';
              const newerSrc = hasAnewerDate ? reqA.sourceName : reqB.sourceName;
              const olderSrc = hasAnewerDate ? reqB.sourceName : reqA.sourceName;
              assessment = `${newerSrc} was published later and appears to supersede or extend the deadline published in ${olderSrc}.`;
            }

            conflicts.push({
              id: `conflict-deadline-${reqA.id}-${reqB.id}`,
              requirementCategory: 'deadline',
              requirementTitle: 'Application Deadline',
              classification,
              relationship,
              severity: 'High',
              sourceA: {
                sourceId: reqA.sourceId,
                name: reqA.sourceName,
                type: reqA.sourceType,
                requirement: reqA.displayValue,
                date: reqA.publicationDate,
                evidence: reqA.evidenceQuote,
                pageOrSection: reqA.pageOrSection,
                authorityLevel: srcA?.authorityTier || reqA.authorityTier,
                isNewer: hasAnewerDate,
              },
              sourceB: {
                sourceId: reqB.sourceId,
                name: reqB.sourceName,
                type: reqB.sourceType,
                requirement: reqB.displayValue,
                date: reqB.publicationDate,
                evidence: reqB.evidenceQuote,
                pageOrSection: reqB.pageOrSection,
                authorityLevel: srcB?.authorityTier || reqB.authorityTier,
                isNewer: hasBnewerDate,
              },
              authorityComparison: authorityComp,
              recencyInformation: recencyComp.recencyInformation,
              assessment,
              confidence: 0.95,
              recommendedAction: 'Verify the active application portal closing date immediately before preparing or submitting application.',
            });
          }
        }

        // 2. INCOME LIMIT COMPARISON
        else if (category === 'income_limit') {
          const valA = reqA.numericValue;
          const valB = reqB.numericValue;

          if (valA !== undefined && valB !== undefined && valA !== valB) {
            let classification: ConflictClassification = 'Contradiction';
            let relationship: ConflictItem['relationship'] = 'CONFLICT';
            let assessment = `Discrepancy in maximum family income threshold: ${reqA.sourceName} states ${reqA.displayValue}, whereas ${reqB.sourceName} states ${reqB.displayValue}.`;

            if (reqA.conditionText || reqB.conditionText) {
              classification = 'Conditional Difference';
              relationship = 'CONDITIONAL MATCH';
              assessment = `Income ceilings differ conditionally: ${reqA.conditionText || 'Standard category'}: ${reqA.displayValue} vs ${reqB.conditionText || 'Special category'}: ${reqB.displayValue}.`;
            } else if (hasAnewerDate || hasBnewerDate) {
              classification = 'Potentially Outdated';
              relationship = 'OUTDATED';
              const older = hasAnewerDate ? reqB.sourceName : reqA.sourceName;
              assessment = `Income threshold in ${older} may be outdated compared to newer issued notifications.`;
            }

            conflicts.push({
              id: `conflict-income-${reqA.id}-${reqB.id}`,
              requirementCategory: 'income_limit',
              requirementTitle: 'Annual Family Income Limit',
              classification,
              relationship,
              severity: 'High',
              sourceA: {
                sourceId: reqA.sourceId,
                name: reqA.sourceName,
                type: reqA.sourceType,
                requirement: reqA.displayValue,
                date: reqA.publicationDate,
                evidence: reqA.evidenceQuote,
                pageOrSection: reqA.pageOrSection,
                authorityLevel: srcA?.authorityTier || reqA.authorityTier,
                isNewer: hasAnewerDate,
              },
              sourceB: {
                sourceId: reqB.sourceId,
                name: reqB.sourceName,
                type: reqB.sourceType,
                requirement: reqB.displayValue,
                date: reqB.publicationDate,
                evidence: reqB.evidenceQuote,
                pageOrSection: reqB.pageOrSection,
                authorityLevel: srcB?.authorityTier || reqB.authorityTier,
                isNewer: hasBnewerDate,
              },
              authorityComparison: authorityComp,
              recencyInformation: recencyComp.recencyInformation,
              assessment,
              confidence: 0.92,
              recommendedAction: 'Verify qualifying income certificate ceiling with the official issuing authority or latest circular before issuing income certificate.',
            });
          }
        }

        // 3. AGE LIMIT COMPARISON
        else if (category === 'age_limit') {
          const valA = reqA.numericValue;
          const valB = reqB.numericValue;
          if (valA !== undefined && valB !== undefined && valA !== valB) {
            const isConditional = Boolean(reqA.conditionText || reqB.conditionText);
            const classification: ConflictClassification = isConditional ? 'Conditional Difference' : 'Contradiction';
            const relationship: ConflictItem['relationship'] = isConditional ? 'CONDITIONAL MATCH' : 'CONFLICT';

            conflicts.push({
              id: `conflict-age-${reqA.id}-${reqB.id}`,
              requirementCategory: 'age_limit',
              requirementTitle: 'Age Limit',
              classification,
              relationship,
              severity: 'High',
              sourceA: {
                sourceId: reqA.sourceId,
                name: reqA.sourceName,
                type: reqA.sourceType,
                requirement: reqA.displayValue,
                date: reqA.publicationDate,
                evidence: reqA.evidenceQuote,
                pageOrSection: reqA.pageOrSection,
                authorityLevel: srcA?.authorityTier || reqA.authorityTier,
                isNewer: hasAnewerDate,
              },
              sourceB: {
                sourceId: reqB.sourceId,
                name: reqB.sourceName,
                type: reqB.sourceType,
                requirement: reqB.displayValue,
                date: reqB.publicationDate,
                evidence: reqB.evidenceQuote,
                pageOrSection: reqB.pageOrSection,
                authorityLevel: srcB?.authorityTier || reqB.authorityTier,
                isNewer: hasBnewerDate,
              },
              authorityComparison: authorityComp,
              recencyInformation: recencyComp.recencyInformation,
              assessment: isConditional
                ? `Age criteria vary based on categories or qualifications (${reqA.conditionText || 'General'} vs ${reqB.conditionText || 'Relaxation'}).`
                : `Official sources provide conflicting maximum age limits (${reqA.displayValue} vs ${reqB.displayValue}).`,
              confidence: 0.9,
              recommendedAction: 'Confirm exact age cut-off date and applicable category relaxation guidelines.',
            });
          }
        }

        // 4. ACADEMIC PERCENTAGE COMPARISON
        else if (category === 'academic_percentage') {
          const valA = reqA.numericValue;
          const valB = reqB.numericValue;
          if (valA !== undefined && valB !== undefined && Math.abs(valA - valB) >= 1) {
            const isConditional = Boolean(reqA.conditionText || reqB.conditionText);
            const classification: ConflictClassification = isConditional ? 'Conditional Difference' : 'Contradiction';
            const relationship: ConflictItem['relationship'] = isConditional ? 'CONDITIONAL MATCH' : 'CONFLICT';

            conflicts.push({
              id: `conflict-academic-${reqA.id}-${reqB.id}`,
              requirementCategory: 'academic_percentage',
              requirementTitle: 'Minimum Academic Marks / Percentage',
              classification,
              relationship,
              severity: 'Medium',
              sourceA: {
                sourceId: reqA.sourceId,
                name: reqA.sourceName,
                type: reqA.sourceType,
                requirement: reqA.displayValue,
                date: reqA.publicationDate,
                evidence: reqA.evidenceQuote,
                pageOrSection: reqA.pageOrSection,
                authorityLevel: srcA?.authorityTier || reqA.authorityTier,
                isNewer: hasAnewerDate,
              },
              sourceB: {
                sourceId: reqB.sourceId,
                name: reqB.sourceName,
                type: reqB.sourceType,
                requirement: reqB.displayValue,
                date: reqB.publicationDate,
                evidence: reqB.evidenceQuote,
                pageOrSection: reqB.pageOrSection,
                authorityLevel: srcB?.authorityTier || reqB.authorityTier,
                isNewer: hasBnewerDate,
              },
              authorityComparison: authorityComp,
              recencyInformation: recencyComp.recencyInformation,
              assessment: isConditional
                ? `Qualifying percentage requirements differ by course or category (${reqA.conditionText || 'Standard'} vs ${reqB.conditionText || 'Relaxation'}).`
                : `Sources disagree on minimum aggregate mark threshold (${reqA.displayValue} vs ${reqB.displayValue}).`,
              confidence: 0.88,
              recommendedAction: 'Verify whether the aggregate percentage applies to previous year marks or 10th/12th board exams.',
            });
          }
        }

        // 5. GENERAL TEXT / ELIGIBILITY / DOMICILE / CATEGORY / FEES CONFLICTS
        else {
          const normA = reqA.displayValue.trim().toLowerCase();
          const normB = reqB.displayValue.trim().toLowerCase();

          // Check for direct contradictions (e.g., only vs all, free vs fee, mandatory vs optional)
          const hasNegation =
            (normA.includes('only') && !normB.includes('only') && (normB.includes('all') || normB.includes('any') || normB.includes('open'))) ||
            (normB.includes('only') && !normA.includes('only') && (normA.includes('all') || normA.includes('any') || normA.includes('open'))) ||
            (normA.includes('mandatory') && normB.includes('optional')) ||
            (normB.includes('mandatory') && normA.includes('optional')) ||
            (normA.includes('free') && normB.includes('fee')) ||
            (normB.includes('free') && normA.includes('fee'));

          // Check for distinct criteria in the same specific category
          const isCategoryDiscrepancy =
            category === 'category' &&
            normA !== normB &&
            ((normA.includes('sc') && !normB.includes('sc')) ||
              (normA.includes('girls') && !normB.includes('girls')) ||
              (normA.includes('minority') && !normB.includes('minority')));

          const isDomicileDiscrepancy =
            category === 'domicile' &&
            normA !== normB &&
            ((normA.includes('all india') && !normB.includes('all india')) ||
              (normB.includes('all india') && !normA.includes('all india')));

          if (hasNegation || isCategoryDiscrepancy || isDomicileDiscrepancy) {
            const isAmbiguous = normA.includes('subject to') || normB.includes('subject to') || normA.includes('as applicable');
            const classification: ConflictClassification = isAmbiguous ? 'Ambiguous' : 'Contradiction';
            const relationship: ConflictItem['relationship'] = isAmbiguous ? 'AMBIGUOUS' : 'CONFLICT';

            conflicts.push({
              id: `conflict-general-${reqA.id}-${reqB.id}`,
              requirementCategory: reqA.category,
              requirementTitle: reqA.title,
              classification,
              relationship,
              severity: 'Medium',
              sourceA: {
                sourceId: reqA.sourceId,
                name: reqA.sourceName,
                type: reqA.sourceType,
                requirement: reqA.displayValue,
                date: reqA.publicationDate,
                evidence: reqA.evidenceQuote,
                pageOrSection: reqA.pageOrSection,
                authorityLevel: srcA?.authorityTier || reqA.authorityTier,
                isNewer: hasAnewerDate,
              },
              sourceB: {
                sourceId: reqB.sourceId,
                name: reqB.sourceName,
                type: reqB.sourceType,
                requirement: reqB.displayValue,
                date: reqB.publicationDate,
                evidence: reqB.evidenceQuote,
                pageOrSection: reqB.pageOrSection,
                authorityLevel: srcB?.authorityTier || reqB.authorityTier,
                isNewer: hasBnewerDate,
              },
              authorityComparison: authorityComp,
              recencyInformation: recencyComp.recencyInformation,
              assessment: `Official sources describe this requirement with diverging criteria: "${reqA.displayValue}" vs "${reqB.displayValue}".`,
              confidence: 0.82,
              recommendedAction: `Verify ${reqA.title} guidelines with official scholarship helpdesk before submission.`,
            });
          }
        }
      }
    }
  });

  return conflicts;
}

/**
 * Deterministically check applicant eligibility against extracted rules
 */
export function checkApplicantEligibilityDeterministically(
  applicant: ApplicantProfile,
  requirements: NormalizedRequirement[],
  conflicts: ConflictItem[]
): {
  results: EligibilityCriterionResult[];
  overallStatus: EligibilityStatus;
} {
  const results: EligibilityCriterionResult[] = [];
  let hasIneligible = false;
  let hasCannotVerify = false;
  let hasConditional = false;
  let hasEligible = false;

  // Conflict categories map for quick checking
  const conflictedCategories = new Set(conflicts.map((c) => c.requirementCategory));

  // 1. Income Check
  const incomeReqs = requirements.filter((r) => r.category === 'income_limit');
  if (incomeReqs.length > 0) {
    const isConflicted = conflictedCategories.has('income_limit');
    // Check against requirements
    const primaryReq = incomeReqs[0];
    const maxIncome = primaryReq.numericValue;

    if (maxIncome !== undefined && applicant.annualFamilyIncome !== undefined) {
      const applicantIncomeFormatted = formatCurrency(applicant.annualFamilyIncome, applicant.currency || '₹');
      const reqIncomeFormatted = formatCurrency(maxIncome, applicant.currency || '₹');

      if (isConflicted) {
        hasCannotVerify = true;
        results.push({
          criterion: 'Annual Family Income',
          category: 'income_limit',
          applicantValue: applicantIncomeFormatted,
          requirementValue: primaryReq.displayValue,
          status: 'Cannot Verify',
          confidence: 0.9,
          evidence: primaryReq.evidenceQuote,
          sourceName: primaryReq.sourceName,
          notes: 'Cannot confidently determine because official sources provide conflicting income ceiling values.',
          hasConflictWarning: true,
        });
      } else if (applicant.annualFamilyIncome > maxIncome) {
        hasIneligible = true;
        results.push({
          criterion: 'Annual Family Income',
          category: 'income_limit',
          applicantValue: applicantIncomeFormatted,
          requirementValue: `≤ ${reqIncomeFormatted}`,
          status: 'Ineligible',
          confidence: 0.98,
          evidence: primaryReq.evidenceQuote,
          sourceName: primaryReq.sourceName,
          notes: `Applicant income (${applicantIncomeFormatted}) exceeds the official limit (${reqIncomeFormatted}).`,
        });
      } else {
        hasEligible = true;
        results.push({
          criterion: 'Annual Family Income',
          category: 'income_limit',
          applicantValue: applicantIncomeFormatted,
          requirementValue: `≤ ${reqIncomeFormatted}`,
          status: 'Likely Eligible',
          confidence: 0.95,
          evidence: primaryReq.evidenceQuote,
          sourceName: primaryReq.sourceName,
          notes: `Meets family income requirement (Income: ${applicantIncomeFormatted} ≤ ${reqIncomeFormatted}).`,
        });
      }
    }
  }

  // 2. Age Check
  const ageReqs = requirements.filter((r) => r.category === 'age_limit');
  if (ageReqs.length > 0 && applicant.age !== undefined) {
    const isConflicted = conflictedCategories.has('age_limit');
    const primaryAgeReq = ageReqs[0];
    const maxAge = primaryAgeReq.numericValue;

    if (maxAge !== undefined) {
      if (isConflicted) {
        hasCannotVerify = true;
        results.push({
          criterion: 'Applicant Age',
          category: 'age_limit',
          applicantValue: `${applicant.age} years`,
          requirementValue: primaryAgeReq.displayValue,
          status: 'Cannot Verify',
          confidence: 0.88,
          evidence: primaryAgeReq.evidenceQuote,
          sourceName: primaryAgeReq.sourceName,
          notes: 'Official sources disagree on maximum age or cut-off calculation date.',
          hasConflictWarning: true,
        });
      } else if (applicant.age > maxAge) {
        hasIneligible = true;
        results.push({
          criterion: 'Applicant Age',
          category: 'age_limit',
          applicantValue: `${applicant.age} years`,
          requirementValue: `≤ ${maxAge} years`,
          status: 'Ineligible',
          confidence: 0.96,
          evidence: primaryAgeReq.evidenceQuote,
          sourceName: primaryAgeReq.sourceName,
          notes: `Applicant age (${applicant.age}) exceeds the stated maximum limit (${maxAge} years).`,
        });
      } else {
        hasEligible = true;
        results.push({
          criterion: 'Applicant Age',
          category: 'age_limit',
          applicantValue: `${applicant.age} years`,
          requirementValue: `≤ ${maxAge} years`,
          status: 'Likely Eligible',
          confidence: 0.94,
          evidence: primaryAgeReq.evidenceQuote,
          sourceName: primaryAgeReq.sourceName,
          notes: `Applicant satisfies the age requirement (${applicant.age} years ≤ ${maxAge} years).`,
        });
      }
    }
  }

  // 3. Academic Percentage / Marks Check
  const marksReqs = requirements.filter((r) => r.category === 'academic_percentage');
  if (marksReqs.length > 0 && applicant.academicPercentage !== undefined) {
    const primaryMarksReq = marksReqs[0];
    const minMarks = primaryMarksReq.numericValue;

    if (minMarks !== undefined) {
      if (applicant.academicPercentage < minMarks) {
        hasIneligible = true;
        results.push({
          criterion: 'Academic Percentage / Score',
          category: 'academic_percentage',
          applicantValue: `${applicant.academicPercentage}%`,
          requirementValue: `≥ ${minMarks}%`,
          status: 'Ineligible',
          confidence: 0.95,
          evidence: primaryMarksReq.evidenceQuote,
          sourceName: primaryMarksReq.sourceName,
          notes: `Applicant academic score (${applicant.academicPercentage}%) is lower than minimum cut-off (${minMarks}%).`,
        });
      } else {
        hasEligible = true;
        results.push({
          criterion: 'Academic Percentage / Score',
          category: 'academic_percentage',
          applicantValue: `${applicant.academicPercentage}%`,
          requirementValue: `≥ ${minMarks}%`,
          status: 'Likely Eligible',
          confidence: 0.94,
          evidence: primaryMarksReq.evidenceQuote,
          sourceName: primaryMarksReq.sourceName,
          notes: `Applicant score meets or exceeds minimum cut-off requirement (${applicant.academicPercentage}% ≥ ${minMarks}%).`,
        });
      }
    }
  }

  // 4. Social Category / Reservation Check
  const categoryReqs = requirements.filter((r) => r.category === 'category');
  if (categoryReqs.length > 0 && applicant.category) {
    const reqText = categoryReqs.map((r) => r.displayValue.toLowerCase()).join(' ');
    const appCat = applicant.category.toLowerCase();

    // Check if category matches or is restricted
    const isTargeted =
      reqText.includes(appCat) ||
      (appCat === 'general' && (reqText.includes('all') || reqText.includes('merit') || reqText.includes('open'))) ||
      (!reqText.includes('only') && (reqText.includes('all categories') || reqText.includes('any category')));

    const isExclusivelyOther =
      (reqText.includes('only sc') && appCat !== 'sc') ||
      (reqText.includes('only st') && appCat !== 'st') ||
      (reqText.includes('minority only') && !['minority', 'muslim', 'christian', 'sikh', 'buddhist', 'jain', 'parsi'].includes(appCat));

    if (isExclusivelyOther) {
      hasIneligible = true;
      results.push({
        criterion: 'Category / Community',
        category: 'category',
        applicantValue: applicant.category,
        requirementValue: categoryReqs[0].displayValue,
        status: 'Ineligible',
        confidence: 0.92,
        evidence: categoryReqs[0].evidenceQuote,
        sourceName: categoryReqs[0].sourceName,
        notes: `Scholarship is strictly designated for specific categories not matching applicant's category (${applicant.category}).`,
      });
    } else {
      results.push({
        criterion: 'Category / Community',
        category: 'category',
        applicantValue: applicant.category,
        requirementValue: categoryReqs[0].displayValue,
        status: isTargeted ? 'Likely Eligible' : 'Conditionally Eligible',
        confidence: 0.88,
        evidence: categoryReqs[0].evidenceQuote,
        sourceName: categoryReqs[0].sourceName,
        notes: isTargeted
          ? `Applicant category (${applicant.category}) is covered under this scheme.`
          : `Verify if quota or separate merit list applies to category ${applicant.category}.`,
      });
    }
  }

  // 5. Domicile / State Check
  const stateReqs = requirements.filter((r) => r.category === 'domicile');
  if (stateReqs.length > 0 && applicant.state) {
    const stateText = stateReqs.map((r) => r.displayValue.toLowerCase()).join(' ');
    const appState = applicant.state.toLowerCase();

    if (stateText.includes('all india') || stateText.includes('any state') || stateText.includes('national')) {
      results.push({
        criterion: 'State / Domicile',
        category: 'domicile',
        applicantValue: applicant.state,
        requirementValue: stateReqs[0].displayValue,
        status: 'Likely Eligible',
        confidence: 0.95,
        evidence: stateReqs[0].evidenceQuote,
        sourceName: stateReqs[0].sourceName,
        notes: `Scheme is open nationally. Applicant domicile (${applicant.state}) is valid.`,
      });
    } else if (stateText.includes(appState)) {
      results.push({
        criterion: 'State / Domicile',
        category: 'domicile',
        applicantValue: applicant.state,
        requirementValue: stateReqs[0].displayValue,
        status: 'Likely Eligible',
        confidence: 0.95,
        evidence: stateReqs[0].evidenceQuote,
        sourceName: stateReqs[0].sourceName,
        notes: `Applicant resident state (${applicant.state}) matches official domicile requirement.`,
      });
    } else if (stateReqs[0].displayValue.length > 3) {
      hasIneligible = true;
      results.push({
        criterion: 'State / Domicile',
        category: 'domicile',
        applicantValue: applicant.state,
        requirementValue: stateReqs[0].displayValue,
        status: 'Ineligible',
        confidence: 0.91,
        evidence: stateReqs[0].evidenceQuote,
        sourceName: stateReqs[0].sourceName,
        notes: `Scheme is restricted to residents of specific state/UT (${stateReqs[0].displayValue}). Applicant is from ${applicant.state}.`,
      });
    }
  }

  // 6. Course & Study Level Check
  const courseReqs = requirements.filter((r) => r.category === 'course');
  if (courseReqs.length > 0 && applicant.course) {
    results.push({
      criterion: 'Course / Academic Program',
      category: 'course',
      applicantValue: `${applicant.course} (${applicant.yearOfStudy || 'Enrolled'})`,
      requirementValue: courseReqs[0].displayValue,
      status: 'Likely Eligible',
      confidence: 0.86,
      evidence: courseReqs[0].evidenceQuote,
      sourceName: courseReqs[0].sourceName,
      notes: `Course enrolment (${applicant.course}) appears consistent with eligible study level.`,
    });
  }

  // Determine overall status deterministically
  let overallStatus: EligibilityStatus = 'Cannot Verify';
  if (hasIneligible) {
    overallStatus = 'Ineligible';
  } else if (hasCannotVerify) {
    overallStatus = 'Cannot Verify';
  } else if (hasConditional) {
    overallStatus = 'Conditionally Eligible';
  } else if (hasEligible) {
    overallStatus = 'Likely Eligible';
  } else {
    overallStatus = 'Eligible but Incomplete';
  }

  return { results, overallStatus };
}

/**
 * Generate structured Source Audit Matrix
 */
export function generateSourceAuditMatrix(
  requirements: NormalizedRequirement[],
  sources: ScholarshipSource[],
  conflicts: ConflictItem[]
): {
  sources: { id: string; name: string; type: SourceType; tier: AuthorityTier }[];
  rows: SourceAuditRow[];
} {
  const auditSources = sources.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    tier: s.authorityTier,
  }));

  const standardCategories: { key: string; label: string; cat: RequirementCategory }[] = [
    { key: 'deadline', label: 'Application Deadline', cat: 'deadline' },
    { key: 'income_limit', label: 'Family Income Ceiling', cat: 'income_limit' },
    { key: 'age_limit', label: 'Age Criteria', cat: 'age_limit' },
    { key: 'academic_percentage', label: 'Academic Qualification / Marks', cat: 'academic_percentage' },
    { key: 'course', label: 'Eligible Courses / Streams', cat: 'course' },
    { key: 'category', label: 'Social Category / Quotas', cat: 'category' },
    { key: 'domicile', label: 'Domicile / State Residence', cat: 'domicile' },
    { key: 'documents', label: 'Required Documentation', cat: 'documents' },
    { key: 'fees', label: 'Application Fees', cat: 'fees' },
    { key: 'instructions', label: 'Application Process / Portal', cat: 'instructions' },
    { key: 'other_conditions', label: 'Other Terms & Conditions', cat: 'other_conditions' },
  ];

  const conflictCategories = new Set(conflicts.map((c) => c.requirementCategory));

  const rows: SourceAuditRow[] = [];

  standardCategories.forEach((sc) => {
    const matchingReqs = requirements.filter((r) => r.category === sc.cat);
    if (matchingReqs.length === 0) return; // Omit empty rows if not present anywhere

    const valuesBySource: Record<string, SourceAuditCell> = {};
    let hasEntriesCount = 0;

    sources.forEach((src) => {
      const srcReq = matchingReqs.find((r) => r.sourceId === src.id);
      if (srcReq) {
        hasEntriesCount++;
        valuesBySource[src.id] = {
          value: srcReq.displayValue,
          evidence: srcReq.evidenceQuote,
          date: srcReq.publicationDate,
          pageOrSection: srcReq.pageOrSection,
        };
      } else {
        valuesBySource[src.id] = {
          value: 'Not specified in this source',
        };
      }
    });

    let overallStatus: SourceAuditRow['overallStatus'] = 'Consistent';
    if (conflictCategories.has(sc.cat)) {
      overallStatus = 'Possible Conflict';
    } else if (hasEntriesCount < sources.length && sources.length > 1) {
      overallStatus = 'Missing in Some Sources';
    }

    rows.push({
      requirementKey: sc.key,
      requirementLabel: sc.label,
      valuesBySource,
      overallStatus,
    });
  });

  return { sources: auditSources, rows };
}

/**
 * Compile prioritized Verification Queue
 */
export function compileVerificationQueue(
  conflicts: ConflictItem[],
  eligibilityResults: EligibilityCriterionResult[],
  sources: ScholarshipSource[],
  documents: DocumentRequirementItem[]
): VerificationQueueItem[] {
  const queue: VerificationQueueItem[] = [];

  // 1. High priority from conflicts
  conflicts.forEach((conflict) => {
    queue.push({
      id: `queue-${conflict.id}`,
      whatToVerify: `${conflict.requirementTitle} discrepancy`,
      whyItMatters: conflict.assessment,
      source: `${conflict.sourceA.name} vs ${conflict.sourceB.name}`,
      priority: conflict.severity,
      status:
        conflict.classification === 'Contradiction'
          ? 'Conflict Detected'
          : conflict.classification === 'Potentially Outdated'
          ? 'Potentially Outdated'
          : 'Needs Verification',
      recommendedAction: conflict.recommendedAction,
    });
  });

  // 2. Cannot verify criteria from eligibility
  eligibilityResults
    .filter((e) => e.status === 'Cannot Verify' && !queue.some((q) => q.whatToVerify.toLowerCase().includes(e.criterion.toLowerCase())))
    .forEach((e) => {
      queue.push({
        id: `queue-eligibility-${e.category}`,
        whatToVerify: `${e.criterion} requirement`,
        whyItMatters: e.notes,
        source: e.sourceName,
        priority: 'High',
        status: 'Needs Verification',
        recommendedAction: `Contact the scholarship nodal officer to verify whether ${e.applicantValue} meets the official cut-off.`,
      });
    });

  // 3. Document verification
  const conditionalDocs = documents.filter((d) => d.status === 'Conditionally Required' || d.status === 'Cannot Verify');
  if (conditionalDocs.length > 0) {
    queue.push({
      id: 'queue-docs',
      whatToVerify: 'Mandatory certificates checklist',
      whyItMatters: `Specific certificates (${conditionalDocs.map((d) => d.documentName).join(', ')}) are subject to category or state conditions.`,
      source: conditionalDocs[0]?.source || 'Official Guidelines',
      priority: 'Medium',
      status: 'Needs Verification',
      recommendedAction: 'Verify whether physical stamped copies or digital DigiLocker verification is required before upload.',
    });
  }

  // 4. Source recency check
  const portalSource = sources.find((s) => s.type === 'portal');
  if (portalSource && sources.some((s) => s.type === 'notification' || s.type === 'circular')) {
    queue.push({
      id: 'queue-portal-sync',
      whatToVerify: 'Live portal form fields match issued notification',
      whyItMatters: 'Online application form dropdowns and upload slots can occasionally differ from PDF circular guidelines.',
      source: portalSource.name,
      priority: 'Medium',
      status: 'Needs Verification',
      recommendedAction: 'Complete portal registration early to review all mandatory fields and format restrictions well before the deadline.',
    });
  }

  return queue;
}

/**
 * Generate Nuanced Final Recommendation text
 */
export function generateNuancedFinalRecommendation(
  overallEligibility: EligibilityStatus,
  conflicts: ConflictItem[],
  verificationQueue: VerificationQueueItem[]
): string {
  const highConflicts = conflicts.filter((c) => c.severity === 'High');

  if (overallEligibility === 'Ineligible') {
    return 'Based on the official sources currently analyzed, you appear ineligible for this scholarship due to specific criteria (such as income ceiling or age limits) not being met. Do not submit an application without confirming whether special category exemptions apply.';
  }

  if (highConflicts.length > 0) {
    return `Based on the official sources currently analyzed, eligibility cannot be confidently confirmed because official sources provide conflicting information regarding ${highConflicts.map((c) => c.requirementTitle.toLowerCase()).join(' and ')}. Complete the items in your Verification Queue before applying.`;
  }

  if (overallEligibility === 'Likely Eligible') {
    if (verificationQueue.length > 0) {
      return `Based on the official sources currently analyzed, you appear likely eligible for this scholarship. However, please verify the ${verificationQueue.length} items highlighted in your Verification Queue before submitting your application.`;
    }
    return 'Based on the official sources currently analyzed, all stated requirements appear consistent and you appear likely eligible. Ensure all listed documents are prepared in the prescribed official format before final portal submission.';
  }

  if (overallEligibility === 'Conditionally Eligible') {
    return 'Based on the official sources currently analyzed, your eligibility depends on specific conditions (such as domicile verification, institution accreditation, or category certificates). Review the conditional terms before applying.';
  }

  return 'Based on the official sources currently analyzed, information is incomplete or subject to verification. Verify the highlighted criteria on the official live application portal before proceeding.';
}

/**
 * Calculate deterministic Scholarship Audit Score (0 - 100) and risk level
 */
export function calculateAuditScore(params: {
  conflicts: ConflictItem[];
  eligibilityResults: EligibilityCriterionResult[];
  missingInformation: string[];
  potentiallyOutdatedSources?: string[];
}): { score: number; riskLevel: 'Mostly Consistent' | 'Needs Verification' | 'High Risk' } {
  let score = 100;

  const highConflicts = params.conflicts.filter((c) => c.severity === 'High').length;
  const medConflicts = params.conflicts.filter((c) => c.severity === 'Medium').length;
  const lowConflicts = params.conflicts.filter((c) => c.severity === 'Low').length;

  score -= highConflicts * 22;
  score -= medConflicts * 10;
  score -= lowConflicts * 5;

  const unverifiedEligibility = params.eligibilityResults.filter((e) => e.status === 'Cannot Verify').length;
  score -= unverifiedEligibility * 8;

  const missingInfoCount = params.missingInformation?.length || 0;
  score -= missingInfoCount * 4;

  const outdatedCount = params.potentiallyOutdatedSources?.length || 0;
  score -= outdatedCount * 6;

  // Clamp score between 18 and 100
  score = Math.max(18, Math.min(100, score));

  let riskLevel: 'Mostly Consistent' | 'Needs Verification' | 'High Risk' = 'Mostly Consistent';
  if (score < 60 || highConflicts > 0) {
    riskLevel = 'High Risk';
  } else if (score < 85 || params.conflicts.length > 0 || unverifiedEligibility > 0) {
    riskLevel = 'Needs Verification';
  }

  return { score, riskLevel };
}

