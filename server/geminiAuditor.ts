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
}

export async function extractRequirementsWithGemini(
  inputs: RawSourceInput[],
  applicant: ApplicantProfile
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Server GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Build prompt and multimodal contents
  const sourceDescriptions = inputs.map((inp, idx) => {
    return `SOURCE ${idx + 1}:
ID: ${inp.source.id}
Name: ${inp.source.name}
Type: ${inp.source.type}
Claimed Authority: ${inp.source.authorityTier}
URL: ${inp.source.url || 'Uploaded file'}
Text Content (preview/extracted):
${inp.textContent ? inp.textContent.slice(0, 14000) : '[Binary Document attached via inlineData]'}`;
  }).join('\n\n====================\n\n');

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
Special Attributes: ${applicant.specialAttributes.join(', ') || 'None'}
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

  // Append any PDF attachments
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

  // Map and hydrate requirements with source details
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
  };
}
