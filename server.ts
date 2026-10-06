import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  ApplicantProfile,
  RealityReport,
  ScholarshipSource,
} from './src/types';
import { loginUser, loginWithGoogle, registerUser, verifySession } from './server/auth';
import {
  discoverOfficialSources,
  safeFetchUrl,
} from './server/sourceFetcher';
import {
  extractRequirementsWithGemini,
  RawSourceInput,
} from './server/geminiAuditor';
import {
  checkApplicantEligibilityDeterministically,
  compileVerificationQueue,
  detectConflictsDeterministically,
  generateNuancedFinalRecommendation,
  generateSourceAuditMatrix,
  calculateAuditScore,
} from './src/lib/deterministicEngine';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StoredReportEntry {
  userId: string;
  report: RealityReport;
}

function loadReports(): StoredReportEntry[] {
  try {
    if (fs.existsSync(REPORTS_FILE)) {
      return JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading reports file:', err);
  }
  return [];
}

function saveReports(entries: StoredReportEntry[]) {
  try {
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(entries, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing reports file:', err);
  }
}

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Auth extraction middleware
  const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = verifySession(token);
      if (user) {
        (req as any).user = user;
      }
    }
    next();
  };
  app.use(authMiddleware);

  // ==========================================
  // AUTH API ROUTES
  // ==========================================

  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        res.status(400).json({ error: 'Name, email, and password are required.' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters.' });
        return;
      }
      const result = registerUser(name, email, password);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed.' });
    }
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }
      const result = loginUser(email, password);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Login failed.' });
    }
  });

  app.post('/api/auth/google', (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;
      if (!email) {
        res.status(400).json({ error: 'Email is required for Google sign-in.' });
        return;
      }
      const result = loginWithGoogle(email, name);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Google authentication failed.' });
    }
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    res.json({ user });
  });

  // ==========================================
  // SOURCE DISCOVERY API ROUTE
  // ==========================================

  app.post('/api/discover-sources', async (req: Request, res: Response) => {
    try {
      const { primaryUrl } = req.body;
      if (!primaryUrl) {
        res.status(400).json({ error: 'A primary official scholarship URL is required for discovery.' });
        return;
      }

      const discovered = await discoverOfficialSources(primaryUrl);
      if (discovered.length === 0) {
        res.json({
          discovered: [],
          message:
            'No additional official sources could be confidently identified. You can add official sources manually.',
        });
        return;
      }

      res.json({ discovered, count: discovered.length });
    } catch (err: any) {
      console.warn('Source discovery warning:', err.message);
      // Non-fatal per specification
      res.json({
        discovered: [],
        message:
          'No additional official sources could be confidently identified. You can add official sources manually.',
      });
    }
  });

  // ==========================================
  // MAIN AUDIT & ANALYSIS PIPELINE
  // ==========================================

  app.post('/api/analyze', async (req: Request, res: Response) => {
    try {
      const {
        scholarshipName,
        primaryUrl,
        additionalSources = [],
        applicant,
      }: {
        scholarshipName?: string;
        primaryUrl: string;
        additionalSources: ScholarshipSource[];
        applicant: ApplicantProfile;
      } = req.body;

      // 1. Validation
      if (!primaryUrl && additionalSources.length === 0) {
        res.status(400).json({
          error: 'At least one usable official source (URL or official document) is required.',
        });
        return;
      }

      if (!applicant || !applicant.name || !applicant.course) {
        res.status(400).json({
          error: 'Required applicant information (Name and Course/Program) is missing.',
        });
        return;
      }

      // Build source list
      const allSources: ScholarshipSource[] = [];

      if (primaryUrl) {
        let domain = '';
        try {
          domain = new URL(primaryUrl).hostname;
        } catch {
          res.status(400).json({ error: 'The provided primary scholarship URL is not a valid URL.' });
          return;
        }
        allSources.push({
          id: 'src-primary',
          name: scholarshipName ? `${scholarshipName} (Official Website)` : 'Main Official Portal',
          url: primaryUrl,
          type: 'portal',
          authorityTier: 'Current Official Application Portal',
          domain,
        });
      }

      additionalSources.forEach((src, idx) => {
        allSources.push({
          ...src,
          id: src.id || `src-add-${idx + 1}`,
        });
      });

      // 2. Fetch or prepare raw content for each source
      const rawInputs: RawSourceInput[] = [];

      for (const src of allSources) {
        if (src.fileBase64) {
          // Document upload
          rawInputs.push({
            source: src,
            pdfBase64: src.fileBase64,
            pdfMimeType: src.fileMimeType || 'application/pdf',
            textContent: src.contentSnippet,
          });
        } else if (src.url) {
          try {
            const { text, title } = await safeFetchUrl(src.url, 8000);
            if (!src.name || src.name === 'Main Official Portal') {
              src.name = title.slice(0, 60) || src.name;
            }
            rawInputs.push({
              source: src,
              textContent: text,
            });
          } catch (fetchErr: any) {
            console.warn(`Failed fetching ${src.url}:`, fetchErr.message);
            // If primary source failed to fetch and no documents exist, report error
            if (allSources.length === 1) {
              res.status(422).json({
                error: `Unable to read official source at ${src.url}: ${fetchErr.message}. Ensure the website is reachable or upload the official circular PDF directly.`,
              });
              return;
            }
            // If partial failure among multiple sources, record error snippet
            rawInputs.push({
              source: src,
              textContent: `[Notice: Source URL could not be fetched due to: ${fetchErr.message}]`,
            });
          }
        }
      }

      if (rawInputs.length === 0) {
        res.status(400).json({ error: 'No readable official sources could be analyzed.' });
        return;
      }

      // 3. Structured Gemini extraction
      const extraction = await extractRequirementsWithGemini(rawInputs, applicant);

      const effectiveScholarshipName =
        scholarshipName || extraction.detectedScholarshipName || 'Official Scholarship Program';

      // 4. Deterministic Comparison Engine
      const conflicts = detectConflictsDeterministically(extraction.requirements, allSources);

      // 5. Deterministic Applicant Eligibility Engine
      const eligibility = checkApplicantEligibilityDeterministically(
        applicant,
        extraction.requirements,
        conflicts
      );

      // 6. Source Audit Matrix
      const sourceAuditMatrix = generateSourceAuditMatrix(
        extraction.requirements,
        allSources,
        conflicts
      );

      // 7. Verification Queue
      const verificationQueue = compileVerificationQueue(
        conflicts,
        eligibility.results,
        allSources,
        extraction.documents
      );

      // 8. Nuanced Final Recommendation
      const finalRecommendation = generateNuancedFinalRecommendation(
        eligibility.overallStatus,
        conflicts,
        verificationQueue
      );

      // 9. Overall Audit Status Determination & Audit Score
      let overallStatus: RealityReport['overallStatus'] = 'Consistent — Verified';
      if (conflicts.some((c) => c.severity === 'High')) {
        overallStatus = 'Critical Conflicts Found';
      } else if (conflicts.length > 0 || verificationQueue.length > 0) {
        overallStatus = 'Requires Verification';
      } else if (eligibility.overallStatus === 'Ineligible') {
        overallStatus = 'Ineligible Based on Evidence';
      }

      const { score: auditScore, riskLevel } = calculateAuditScore({
        conflicts,
        eligibilityResults: eligibility.results,
        missingInformation: extraction.missingInformation,
        potentiallyOutdatedSources: extraction.authorityAnalysis.potentiallyOutdatedSources,
      });

      const reportId = `report-${Date.now()}`;
      const report: RealityReport = {
        id: reportId,
        createdAt: new Date().toISOString(),
        scholarshipName: effectiveScholarshipName,
        primaryUrl: primaryUrl || allSources[0]?.url || '',
        overallStatus,
        auditScore,
        riskLevel,
        executiveSummary: `Audited ${allSources.length} official source(s). InfoGuard identified ${extraction.requirements.length} structured requirement(s), ${conflicts.length} cross-source conflict(s), and compiled ${verificationQueue.length} action item(s) to verify before applying.`,
        sourcesAnalyzed: allSources,
        normalizedRequirements: extraction.requirements,
        sourceAuditMatrix,
        conflicts,
        missingInformation: extraction.missingInformation,
        eligibilityAssessment: eligibility.results,
        overallEligibilityStatus: eligibility.overallStatus,
        documents: extraction.documents,
        verificationQueue,
        finalRecommendation,
        authorityFindings: {
          mostAuthoritativeSource: extraction.authorityAnalysis.mostAuthoritativeSource,
          potentiallyOutdatedSources: extraction.authorityAnalysis.potentiallyOutdatedSources,
          summary: extraction.authorityAnalysis.summary,
        },
      };

      // Save report if user is authenticated
      const user = (req as any).user;
      if (user) {
        const stored = loadReports();
        stored.unshift({ userId: user.id, report });
        saveReports(stored);
      }

      res.json({ success: true, report });
    } catch (err: any) {
      console.error('Audit pipeline error:', err);
      res.status(500).json({
        error: err.message || 'An error occurred during official source analysis.',
      });
    }
  });

  // ==========================================
  // REPORT HISTORY API ROUTES
  // ==========================================

  app.get('/api/reports', (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required to view history.' });
      return;
    }

    const all = loadReports();
    const userReports = all.filter((entry) => entry.userId === user.id).map((e) => e.report);
    res.json({ reports: userReports });
  });

  app.get('/api/reports/:id', (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;
    const all = loadReports();
    const entry = all.find((e) => e.report.id === id);

    if (!entry) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }

    if (user && entry.userId !== user.id) {
      res.status(403).json({ error: 'Unauthorized to view this report.' });
      return;
    }

    res.json({ report: entry.report });
  });

  app.delete('/api/reports/:id', (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    let all = loadReports();
    const initialLen = all.length;
    all = all.filter((e) => !(e.report.id === id && e.userId === user.id));

    if (all.length === initialLen) {
      res.status(404).json({ error: 'Report not found or not owned by user.' });
      return;
    }

    saveReports(all);
    res.json({ success: true });
  });

  // ==========================================
  // VITE OR STATIC FRONTEND SERVING
  // ==========================================

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`InfoGuard server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server start error:', err);
  process.exit(1);
});
