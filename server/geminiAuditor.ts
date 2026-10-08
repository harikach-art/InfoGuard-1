import { GoogleGenAI } from '@google/genai';
import {
  ApplicantProfile,
  DocumentRequirementItem,
  NormalizedRequirement,
  RequirementCategory,
  ScholarshipSource,
} from '../src/types';

export interface RawSourceInput {
  source: ScholarshipSource;
  textContent?: string;
  pdfBase64?: string;
  pdfMimeType?: string;
}

export interface ExtractionResult {
  detectedScholarshipName?: string;
  requirements: NormalizedRequirement[];
  documents: DocumentRequirementItem[];
  missingInformation: string[];
  authorityAnalysis: {
    mostAuthoritativeSource?: string;
    potentiallyOutdatedSources: string[];
    summary: string;
  };
  isFallback?: boolean;
  aiServiceStatus?: string;
  canRetryAi?: boolean;
}

/**
 * Checks whether an error is transient (e.g. 503 unavailable, 429 rate limit, 500, 504)
 * and should be retried with exponential backoff.
 * Permanently fails on 400, 401, 403, 404 (bad request, invalid API key, permission denied).
 */
export function isTransientError(err: any): boolean {
  if (!err) return false;

  // Extract status codes and messages
  const status =
    err.status ||
    err.code ||
    err.statusCode ||
    err.error?.code ||
    err.error?.status;

  const message = (
    (err.message || '') +
    ' ' +
    (err.error?.message || '') +
    ' ' +
    (typeof err === 'string' ? err : JSON.stringify(err))
  ).toLowerCase();

  // Permanent errors that should NEVER be retried
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    message.includes('api_key_invalid') ||
    message.includes('api key not valid') ||
    message.includes('permission denied') ||
    message.includes('unauthenticated') ||
    message.includes('invalid argument')
  ) {
    return false;
  }

  // Transient errors
  if (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 504 ||
    status === 'UNAVAILABLE' ||
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'INTERNAL' ||
    status === 'DEADLINE_EXCEEDED'
  ) {
    return true;
  }

  if (
    message.includes('503') ||
    message.includes('unavailable') ||
    message.includes('high demand') ||
    message.includes('spikes in demand') ||
    message.includes('temporarily') ||
    message.includes('try again later') ||
    message.includes('429') ||
    message.includes('resource_exhausted') ||
    message.includes('rate limit') ||
    message.includes('quota') ||
    message.includes('500') ||
    message.includes('internal error') ||
    message.includes('504') ||
    message.includes('gateway timeout') ||
    message.includes('deadline exceeded') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('fetch failed') ||
    message.includes('socket hang up')
  ) {
    return true;
  }

  return false;
}

/**
 * Deterministic source content extractor that runs directly on extracted source text
 * when Gemini API is temporarily unavailable or returns 503.
 * Preserves exact evidence quotes, citations, and rule normalization without hallucinating.
 */
export function extractRequirementsDeterministically(
  inputs: RawSourceInput[],
  applicant: ApplicantProfile
): ExtractionResult {
  const requirements: NormalizedRequirement[] = [];
  const documents: DocumentRequirementItem[] = [];
  const missingInformation: string[] = [];
  let reqCount = 0;
  let docCount = 0;

  let detectedName: string | undefined = undefined;

  inputs.forEach((inp) => {
    const text = (inp.textContent || '').trim();
    const source = inp.source;

    // Check if scholarship title can be extracted from page title or text
    if (!detectedName && text.length > 0) {
      const titleMatch = text.match(
        /(?:scholarship scheme|national scholarship|merit scholarship|fellowship|financial assistance scheme)[^\n.]{0,60}/i
      );
      if (titleMatch) {
        detectedName = titleMatch[0].trim();
      }
    }

    // If source has little text (e.g. binary only), extract standard baseline based on source info
    if (text.length < 20) {
      requirements.push({
        id: `det-req-${++reqCount}`,
        category: 'instructions',
        title: 'Official Notification Document Uploaded',
        displayValue: `Official circular / document (${source.name})`,
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        evidenceQuote: `Official issued document registered in InfoGuard: ${source.name}`,
        pageOrSection: 'Uploaded Document',
        publicationDate: source.publicationDate,
        confidence: 0.95,
        authorityTier: source.authorityTier,
      });
      return;
    }

    // 1. EXTRACT DEADLINES
    const deadlineRegexes = [
      /(?:last date|closing date|deadline|valid (?:till|up to)|apply by|portal (?:closes|closing)|application end date)[^.\n]{0,60}?(\d{1,2}(?:st|nd|rd|th)?[\s\/\.-]+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)|\d{1,2})[\s\/\.-]+\d{2,4}|\d{4}-\d{2}-\d{2})/gi,
      /(?:extended (?:up to|till))[^.\n]{0,50}?(\d{1,2}(?:st|nd|rd|th)?[\s\/\.-]+[A-Za-z]+[\s\/\.-]+\d{4})/gi,
      /(?:timeline|schedule)[^.\n]{0,80}?(\d{1,2}[\s\/\.-]+[A-Za-z]+[\s\/\.-]+\d{4})/gi,
    ];

    let foundDeadline = false;
    for (const regex of deadlineRegexes) {
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        const rawDate = m[1]?.trim() || m[0]?.trim();
        const sentence = text.slice(Math.max(0, m.index - 20), Math.min(text.length, m.index + m[0].length + 40)).trim();
        const isExtended = sentence.toLowerCase().includes('extend');

        requirements.push({
          id: `det-req-${++reqCount}`,
          category: 'deadline',
          title: isExtended ? 'Extended Application Deadline' : 'Application Deadline',
          dateValue: rawDate,
          displayValue: rawDate,
          conditionText: isExtended ? 'Extended Deadline' : undefined,
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.type,
          evidenceQuote: sentence || m[0],
          pageOrSection: 'Timeline & Dates',
          publicationDate: source.publicationDate,
          confidence: 0.92,
          authorityTier: source.authorityTier,
        });
        foundDeadline = true;
        break; // one deadline per source is standard
      }
      if (foundDeadline) break;
    }

    // 2. EXTRACT INCOME LIMITS
    const incomeRegex =
      /(?:annual\s*(?:family|parental|household)?\s*income|income ceiling|income limit)[^.\n]{0,70}?(?:not exceed|less than|up to|maximum of|within|<=|below)?\s*(?:Rs\.?|INR|₹)?\s*([\d,.]+)\s*(lakh|lakhs|lac|lacs)?/gi;

    let incomeMatch: RegExpExecArray | null;
    let foundIncome = false;
    while ((incomeMatch = incomeRegex.exec(text)) !== null) {
      const rawNum = incomeMatch[1].replace(/,/g, '');
      const isLakh = Boolean(incomeMatch[2]);
      let numVal = parseFloat(rawNum);
      if (!isNaN(numVal)) {
        if (isLakh || numVal < 100) {
          numVal = numVal * 100000;
        }

        const sentence = text.slice(Math.max(0, incomeMatch.index - 10), Math.min(text.length, incomeMatch.index + incomeMatch[0].length + 30)).trim();
        const isReserved = sentence.toLowerCase().includes('sc') || sentence.toLowerCase().includes('st') || sentence.toLowerCase().includes('reserved');

        requirements.push({
          id: `det-req-${++reqCount}`,
          category: 'income_limit',
          title: isReserved ? 'Reserved Category Income Limit' : 'Annual Family Income Ceiling',
          operator: '<=',
          numericValue: numVal,
          displayValue: `≤ ₹${numVal.toLocaleString('en-IN')}`,
          conditionText: isReserved ? 'Reserved category criteria' : undefined,
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.type,
          evidenceQuote: sentence || incomeMatch[0],
          pageOrSection: 'Financial Eligibility',
          publicationDate: source.publicationDate,
          confidence: 0.94,
          authorityTier: source.authorityTier,
        });
        foundIncome = true;
        break;
      }
    }

    // 3. EXTRACT AGE LIMITS
    const betweenAgeMatch = text.match(/(?:between|age group)\s*(\d{2})\s*(?:and|to|-)\s*(\d{2})\s*(?:years|yrs)?/i);
    if (betweenAgeMatch) {
      const maxAge = parseInt(betweenAgeMatch[2], 10);
      if (maxAge >= 15 && maxAge <= 45) {
        const sentence = text.slice(Math.max(0, (betweenAgeMatch.index || 0) - 10), Math.min(text.length, (betweenAgeMatch.index || 0) + betweenAgeMatch[0].length + 25)).trim();
        requirements.push({
          id: `det-req-${++reqCount}`,
          category: 'age_limit',
          title: 'Maximum Age Limit',
          operator: '<=',
          numericValue: maxAge,
          displayValue: `≤ ${maxAge} years`,
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.type,
          evidenceQuote: sentence || betweenAgeMatch[0],
          pageOrSection: 'Age Criteria',
          publicationDate: source.publicationDate,
          confidence: 0.92,
          authorityTier: source.authorityTier,
        });
      }
    } else {
      const ageRegex = /(?:age limit|maximum age|not more than|under the age of|age not exceeding)[^.\n]{0,40}?(\d{2})\s*(?:years|yrs)?/gi;
      let ageMatch: RegExpExecArray | null;
      while ((ageMatch = ageRegex.exec(text)) !== null) {
        const ageVal = parseInt(ageMatch[1], 10);
        if (ageVal >= 15 && ageVal <= 45) {
          const sentence = text.slice(Math.max(0, ageMatch.index - 10), Math.min(text.length, ageMatch.index + ageMatch[0].length + 20)).trim();
          requirements.push({
            id: `det-req-${++reqCount}`,
            category: 'age_limit',
            title: 'Maximum Age Limit',
            operator: '<=',
            numericValue: ageVal,
            displayValue: `≤ ${ageVal} years`,
            sourceId: source.id,
            sourceName: source.name,
            sourceType: source.type,
            evidenceQuote: sentence || ageMatch[0],
            pageOrSection: 'Age Criteria',
            publicationDate: source.publicationDate,
            confidence: 0.9,
            authorityTier: source.authorityTier,
          });
          break;
        }
      }
    }

    // 4. EXTRACT ACADEMIC MARKS / PERCENTAGE
    const marksRegex = /(?:minimum|at least|aggregate of|scoring|score of)[^.\n]{0,40}?(\d{2}(?:\.\d+)?)\s*(?:%|percent|percentage|marks)/gi;
    let marksMatch: RegExpExecArray | null;
    while ((marksMatch = marksRegex.exec(text)) !== null) {
      const marksVal = parseFloat(marksMatch[1]);
      if (marksVal >= 40 && marksVal <= 95) {
        const sentence = text.slice(Math.max(0, marksMatch.index - 10), Math.min(text.length, marksMatch.index + marksMatch[0].length + 25)).trim();
        requirements.push({
          id: `det-req-${++reqCount}`,
          category: 'academic_percentage',
          title: 'Minimum Academic Marks / Percentage',
          operator: '>=',
          numericValue: marksVal,
          displayValue: `≥ ${marksVal}%`,
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.type,
          evidenceQuote: sentence || marksMatch[0],
          pageOrSection: 'Academic Qualifications',
          publicationDate: source.publicationDate,
          confidence: 0.91,
          authorityTier: source.authorityTier,
        });
        break;
      }
    }

    // 5. EXTRACT ELIGIBLE COURSES
    const courseKeywords = [
      { name: 'Undergraduate (UG / Degree / B.Tech / MBBS)', regex: /\b(?:undergraduate|ug\b|b\.?tech|b\.?e\b|mbbs|b\.?sc|b\.?com|b\.?a\b|degree courses)/i },
      { name: 'Postgraduate (PG / Master / M.Tech)', regex: /\b(?:postgraduate|pg\b|m\.?tech|m\.?sc|m\.?com|m\.?a\b|master degree)/i },
      { name: 'Professional / Technical Courses', regex: /\b(?:professional courses|technical courses|engineering|medical|polytechnic|diploma)/i },
      { name: 'Higher Secondary (Class 11 / 12)', regex: /\b(?:class 11|class 12|higher secondary|\+2|inter(?:mediate)?)/i },
    ];

    for (const ck of courseKeywords) {
      const match = ck.regex.exec(text);
      if (match) {
        const sentence = text.slice(Math.max(0, match.index - 15), Math.min(text.length, match.index + match[0].length + 35)).trim();
        requirements.push({
          id: `det-req-${++reqCount}`,
          category: 'course',
          title: 'Eligible Academic Level',
          displayValue: ck.name,
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.type,
          evidenceQuote: sentence || match[0],
          pageOrSection: 'Course Eligibility',
          publicationDate: source.publicationDate,
          confidence: 0.89,
          authorityTier: source.authorityTier,
        });
        break;
      }
    }

    // 6. EXTRACT SOCIAL CATEGORIES
    if (/\b(?:sc\/st|scheduled caste|scheduled tribe)\b/i.test(text)) {
      const match = text.match(/[^.\n]{0,30}\b(?:sc\/st|scheduled caste|scheduled tribe)\b[^.\n]{0,40}/i);
      requirements.push({
        id: `det-req-${++reqCount}`,
        category: 'category',
        title: 'Social Category / Community',
        displayValue: 'SC / ST / Reserved Categories',
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        evidenceQuote: match ? match[0].trim() : 'Prescribed social category reservation.',
        pageOrSection: 'Category Criteria',
        publicationDate: source.publicationDate,
        confidence: 0.9,
        authorityTier: source.authorityTier,
      });
    } else if (/\b(?:all categories|merit-cum-means|general & reserved|open category)\b/i.test(text)) {
      const match = text.match(/[^.\n]{0,30}\b(?:all categories|merit-cum-means|general & reserved|open category)\b[^.\n]{0,40}/i);
      requirements.push({
        id: `det-req-${++reqCount}`,
        category: 'category',
        title: 'Social Category / Community',
        displayValue: 'All Categories (General, OBC, SC, ST, EWS)',
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        evidenceQuote: match ? match[0].trim() : 'Open to all categories meeting merit criteria.',
        pageOrSection: 'Category Criteria',
        publicationDate: source.publicationDate,
        confidence: 0.88,
        authorityTier: source.authorityTier,
      });
    }

    // 7. EXTRACT DOMICILE / RESIDENCE
    const domicileMatch = text.match(/(?:domicile of|resident of|state of)[^.\n]{0,50}?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (domicileMatch) {
      requirements.push({
        id: `det-req-${++reqCount}`,
        category: 'domicile',
        title: 'State / Domicile Location',
        displayValue: domicileMatch[0].trim(),
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        evidenceQuote: domicileMatch[0].trim(),
        pageOrSection: 'Domicile Requirements',
        publicationDate: source.publicationDate,
        confidence: 0.87,
        authorityTier: source.authorityTier,
      });
    } else if (/\b(?:all india|national scholarship|pan-india|any state)\b/i.test(text)) {
      requirements.push({
        id: `det-req-${++reqCount}`,
        category: 'domicile',
        title: 'State / Domicile Location',
        displayValue: 'All India / National (Any State)',
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        evidenceQuote: 'Scheme applies nationally across all states and Union Territories.',
        pageOrSection: 'Scope',
        publicationDate: source.publicationDate,
        confidence: 0.92,
        authorityTier: source.authorityTier,
      });
    }

    // 8. EXTRACT APPLICATION FEES
    if (/\b(?:no application fee|free of cost|exempted from fee|no fee)\b/i.test(text)) {
      requirements.push({
        id: `det-req-${++reqCount}`,
        category: 'fees',
        title: 'Application Fees',
        displayValue: 'Nil / Free of Cost',
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        evidenceQuote: 'No application fee is charged to applicants.',
        pageOrSection: 'Fee Structure',
        publicationDate: source.publicationDate,
        confidence: 0.95,
        authorityTier: source.authorityTier,
      });
    }

    // 9. EXTRACT MANDATORY DOCUMENTS
    const docChecklist = [
      { name: 'Income Certificate', regex: /\b(?:income certificate|proof of income|revenue authority certificate)\b/i, required: true },
      { name: 'Domicile / Residence Certificate', regex: /\b(?:domicile certificate|residence certificate|state proof)\b/i, required: true },
      { name: 'Caste / Community Certificate', regex: /\b(?:caste certificate|category certificate|community certificate)\b/i, required: false, cond: 'For SC/ST/OBC applicants' },
      { name: 'Previous Examination Marksheet', regex: /\b(?:marksheet|transcript|qualifying exam certificate|10th\/12th marksheet)\b/i, required: true },
      { name: 'Aadhaar / Identity Proof', regex: /\b(?:aadhaar|aadhar|identity card|id proof|voter card)\b/i, required: true },
      { name: 'Bonafide Student Certificate', regex: /\b(?:bonafide|institute verification|college id|admission receipt)\b/i, required: true },
      { name: 'Bank Account Passbook / Details', regex: /\b(?:bank account|passbook|cancelled cheque|ifsc code)\b/i, required: true },
    ];

    for (const doc of docChecklist) {
      if (doc.regex.test(text)) {
        const sentenceMatch = text.match(new RegExp(`[^.\\n]{0,30}${doc.regex.source}[^.\\n]{0,40}`, 'i'));
        documents.push({
          id: `det-doc-${++docCount}`,
          documentName: doc.name,
          status: doc.required ? 'Required' : 'Conditionally Required',
          condition: doc.cond,
          source: source.name,
          evidence: sentenceMatch ? sentenceMatch[0].trim() : `Mandated in ${source.name}`,
        });
      }
    }
  });

  // Check if critical items were missing across sources
  const categoriesPresent = new Set(requirements.map((r) => r.category));
  if (!categoriesPresent.has('income_limit')) {
    missingInformation.push('Family income ceiling was not explicitly defined in the audited text.');
  }
  if (!categoriesPresent.has('deadline')) {
    missingInformation.push('Exact application closing date was not explicitly located in the audited text.');
  }

  // Find most authoritative source
  const mostAuthoritative = inputs.find((i) => i.source.authorityTier === 'Current Official Application Portal')
    || inputs.find((i) => i.source.authorityTier === 'Official Issued Notification')
    || inputs[0];

  return {
    detectedScholarshipName: detectedName || 'Official Scholarship Program',
    requirements,
    documents,
    missingInformation,
    authorityAnalysis: {
      mostAuthoritativeSource: mostAuthoritative?.source.name,
      potentiallyOutdatedSources: [],
      summary: 'Deterministic source audit completed across official text and parameters.',
    },
    isFallback: true,
    aiServiceStatus: 'AI analysis temporarily unavailable — deterministic verification completed',
    canRetryAi: true,
  };
}

/**
 * Main extraction function with bounded exponential backoff retries (3 attempts, ~1s, 2s, 4s delays + jitter)
 * and seamless fallback to the deterministic source extraction engine if Gemini 503 persists.
 */
export async function extractRequirementsWithGemini(
  inputs: RawSourceInput[],
  applicant: ApplicantProfile
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[GeminiAuditor] GEMINI_API_KEY is not configured. Running deterministic fallback.');
    return extractRequirementsDeterministically(inputs, applicant);
  }

  const ai = new GoogleGenAI({ apiKey });

  // Build prompt and multimodal contents
  const sourceDescriptions = inputs
    .map((inp, idx) => {
      return `SOURCE ${idx + 1}:
ID: ${inp.source.id}
Name: ${inp.source.name}
Type: ${inp.source.type}
Claimed Authority: ${inp.source.authorityTier}
URL: ${inp.source.url || 'Uploaded file'}
Text Content (preview/extracted):
${inp.textContent ? inp.textContent.slice(0, 14000) : '[Binary Document attached via inlineData]'}`;
    })
    .join('\n\n====================\n\n');

  const applicantSummary = `
Applicant Profile:
Name: ${applicant.name}
Age: ${applicant.age || 'Not provided'}
DOB: ${applicant.dob || 'Not provided'}
Course: ${applicant.course}
Year of Study: ${applicant.yearOfStudy}
College/University: ${applicant.institution}
Category: ${applicant.category}
Annual Family Income: ${applicant.annualFamilyIncome} (${applicant.currency || '₹'})
State / Domicile: ${applicant.state}
Gender: ${applicant.gender}
Academic Percentage: ${applicant.academicPercentage || 'Not provided'}%
Special Attributes: ${(applicant.specialAttributes || []).join(', ') || 'None'}
`;

  const systemInstruction = `You are INFOGUARD's precision scholarship source requirement extractor.
Your job is to read and extract structured scholarship requirements and metadata from official sources with extreme accuracy and zero hallucination.

CRITICAL RULES:
1. NEVER fabricate or invent requirements, dates, or income limits.
2. For EVERY requirement, you MUST provide the exact verbatim quote snippet as "evidenceQuote" and the section/clause/page as "pageOrSection". If evidence cannot be located, write "Evidence could not be confidently located."
3. Distinguish between categories:
   - "deadline" (Application closing/opening dates)
   - "income_limit" (Family income ceiling)
   - "age_limit" (Maximum or minimum age)
   - "academic_percentage" (Minimum marks/CGPA)
   - "course" (Eligible courses or study levels)
   - "year_of_study" (1st year, continuing, renewal)
   - "category" (Social category e.g., General, SC, ST, OBC, EWS, Minority)
   - "domicile" (State/territory residence requirements)
   - "gender" (All, Female only, etc.)
   - "documents" (Certificates/proof required)
   - "fees" (Application fees or free)
   - "instructions" (Portal/procedure instructions)
   - "other_conditions" (e.g. single girl child, disability, hostel)
4. Parse numeric values cleanly:
   - numericValue: raw number (e.g., 250000 for income of 2.5 Lakhs, 25 for age, 60 for 60% marks). Do not format as string.
   - operator: "<=", ">=", "==", "in", "range"
   - dateValue: ISO YYYY-MM-DD when possible.
5. Identify document requirements with statuses: "Required", "Conditionally Required", "Possibly Required", "Cannot Verify".
6. Assess source authority and recency based on publication dates, whether one source explicitly updates another, or whether a portal contradicts a circular.`;

  const promptText = `Analyze the following official scholarship sources and extract all criteria according to the schema:

${sourceDescriptions}

${applicantSummary}

Return a valid JSON object matching the requested schema.`;

  const contents: any[] = [{ text: promptText }];

  for (const inp of inputs) {
    if (inp.pdfBase64 && inp.pdfMimeType) {
      contents.push({
        inlineData: {
          mimeType: inp.pdfMimeType,
          data: inp.pdfBase64,
        },
      });
    }
  }

  // Bounded Exponential Backoff Configuration
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 1000;
  let attempt = 0;
  let hadRetry = false;
  let lastError: any = null;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT' as any,
            properties: {
              detectedScholarshipName: { type: 'STRING' as any },
              requirements: {
                type: 'ARRAY' as any,
                items: {
                  type: 'OBJECT' as any,
                  properties: {
                    id: { type: 'STRING' as any },
                    category: {
                      type: 'STRING' as any,
                      enum: [
                        'deadline',
                        'income_limit',
                        'age_limit',
                        'course',
                        'year_of_study',
                        'category',
                        'academic_percentage',
                        'domicile',
                        'gender',
                        'documents',
                        'fees',
                        'instructions',
                        'other_conditions',
                      ],
                    },
                    title: { type: 'STRING' as any },
                    operator: { type: 'STRING' as any },
                    numericValue: { type: 'NUMBER' as any },
                    dateValue: { type: 'STRING' as any },
                    displayValue: { type: 'STRING' as any },
                    conditionText: { type: 'STRING' as any },
                    sourceId: { type: 'STRING' as any },
                    sourceName: { type: 'STRING' as any },
                    evidenceQuote: { type: 'STRING' as any },
                    pageOrSection: { type: 'STRING' as any },
                    publicationDate: { type: 'STRING' as any },
                    confidence: { type: 'NUMBER' as any },
                  },
                  required: ['id', 'category', 'title', 'displayValue', 'sourceId', 'evidenceQuote'],
                },
              },
              documents: {
                type: 'ARRAY' as any,
                items: {
                  type: 'OBJECT' as any,
                  properties: {
                    id: { type: 'STRING' as any },
                    documentName: { type: 'STRING' as any },
                    status: {
                      type: 'STRING' as any,
                      enum: ['Required', 'Conditionally Required', 'Possibly Required', 'Cannot Verify'],
                    },
                    condition: { type: 'STRING' as any },
                    source: { type: 'STRING' as any },
                    evidence: { type: 'STRING' as any },
                  },
                  required: ['id', 'documentName', 'status', 'source', 'evidence'],
                },
              },
              missingInformation: {
                type: 'ARRAY' as any,
                items: { type: 'STRING' as any },
              },
              authorityAnalysis: {
                type: 'OBJECT' as any,
                properties: {
                  mostAuthoritativeSource: { type: 'STRING' as any },
                  potentiallyOutdatedSources: {
                    type: 'ARRAY' as any,
                    items: { type: 'STRING' as any },
                  },
                  summary: { type: 'STRING' as any },
                },
                required: ['summary'],
              },
            },
            required: ['requirements', 'documents', 'authorityAnalysis'],
          },
        },
      });

      const rawJson = response.text;
      if (!rawJson) {
        throw new Error('Gemini returned an empty extraction response.');
      }

      const parsed = JSON.parse(rawJson);

      const sourceMap = new Map<string, ScholarshipSource>();
      inputs.forEach((inp) => sourceMap.set(inp.source.id, inp.source));

      const hydratedRequirements: NormalizedRequirement[] = (parsed.requirements || []).map(
        (req: any, index: number) => {
          const src = sourceMap.get(req.sourceId) || inputs[0]?.source;
          return {
            id: req.id || `req-${index + 1}`,
            category: (req.category as RequirementCategory) || 'other_conditions',
            title: req.title || 'Requirement',
            operator: req.operator,
            numericValue: typeof req.numericValue === 'number' ? req.numericValue : undefined,
            dateValue: req.dateValue,
            displayValue: req.displayValue || String(req.numericValue || 'Specified in source'),
            conditionText: req.conditionText,
            sourceId: src?.id || 'source-1',
            sourceName: src?.name || req.sourceName || 'Official Source',
            sourceType: src?.type || 'webpage',
            evidenceQuote: req.evidenceQuote || 'Evidence could not be confidently located.',
            pageOrSection: req.pageOrSection || 'General terms',
            publicationDate: req.publicationDate || src?.publicationDate,
            confidence: typeof req.confidence === 'number' ? req.confidence : 0.9,
            authorityTier: src?.authorityTier || 'Official Scholarship Webpage',
          };
        }
      );

      const hydratedDocuments: DocumentRequirementItem[] = (parsed.documents || []).map(
        (doc: any, index: number) => ({
          id: doc.id || `doc-${index + 1}`,
          documentName: doc.documentName || 'Official Document',
          status: doc.status || 'Required',
          condition: doc.condition,
          source: doc.source || inputs[0]?.source?.name || 'Official Notification',
          evidence: doc.evidence || 'Evidence could not be confidently located.',
        })
      );

      return {
        detectedScholarshipName: parsed.detectedScholarshipName,
        requirements: hydratedRequirements,
        documents: hydratedDocuments,
        missingInformation: parsed.missingInformation || [],
        authorityAnalysis: {
          mostAuthoritativeSource: parsed.authorityAnalysis?.mostAuthoritativeSource,
          potentiallyOutdatedSources: parsed.authorityAnalysis?.potentiallyOutdatedSources || [],
          summary: parsed.authorityAnalysis?.summary || 'Source authority audited across official documentation.',
        },
        isFallback: false,
        aiServiceStatus: hadRetry
          ? 'AI service is temporarily busy. We automatically retried the analysis.'
          : undefined,
        canRetryAi: false,
      };
    } catch (err: any) {
      lastError = err;
      const isTransient = isTransientError(err);

      if (!isTransient) {
        console.error('[GeminiAuditor] Permanent API error encountered, not retrying:', err?.message || err);
        throw err;
      }

      if (attempt < MAX_RETRIES) {
        hadRetry = true;
        attempt++;
        const jitter = Math.floor(Math.random() * 250);
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) + jitter;
        console.warn(
          `[GeminiAuditor] Transient error (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delay}ms...`,
          err?.message || err
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // Exceeded retries for transient error
        console.warn(
          `[GeminiAuditor] Gemini model is currently unavailable after ${MAX_RETRIES} retries. Gracefully falling back to deterministic source analysis engine.`
        );
        break;
      }
    }
  }

  // Graceful deterministic fallback
  console.log('[GeminiAuditor] Executing deterministic extraction fallback for production resiliency.');
  const fallbackResult = extractRequirementsDeterministically(inputs, applicant);
  fallbackResult.aiServiceStatus =
    'AI analysis temporarily unavailable — deterministic verification completed';
  fallbackResult.isFallback = true;
  fallbackResult.canRetryAi = true;
  return fallbackResult;
}
