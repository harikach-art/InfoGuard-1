import { AuthorityTier, ScholarshipSource, SourceType } from '../src/types';

// Blacklist of known third-party or spam aggregators
const BLOCKED_DOMAINS = [
  'reddit.com',
  'quora.com',
  'medium.com',
  'buddy4study.com',
  'collegedunia.com',
  'shiksha.com',
  'careers360.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'linkedin.com',
  'pinterest.com',
  'youtube.com',
  'blogspot.com',
  'wordpress.com',
];

// Helper to determine if a domain looks like an authoritative official domain
export function isAuthoritativeDomain(urlStr: string, baseDomain?: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();

    // Block private/internal addresses
    if (
      host === 'localhost' ||
      host.startsWith('127.') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.endsWith('.local')
    ) {
      return false;
    }

    // Block blacklisted aggregator domains
    if (BLOCKED_DOMAINS.some((b) => host.includes(b))) {
      return false;
    }

    // Official top-level or second-level domains
    if (
      host.endsWith('.gov') ||
      host.endsWith('.gov.in') ||
      host.endsWith('.nic.in') ||
      host.endsWith('.edu') ||
      host.endsWith('.ac.in') ||
      host.endsWith('.edu.in') ||
      host.endsWith('.org.in') ||
      host.endsWith('.mil')
    ) {
      return true;
    }

    // If same domain as the primary official scholarship website entered by user
    if (baseDomain && (host === baseDomain || host.endsWith('.' + baseDomain))) {
      return true;
    }

    return true;
  } catch {
    return false;
  }
}

// Clean HTML to text
export function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  cleaned = cleaned.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ');

  // Replace block tags with newlines
  cleaned = cleaned.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|section|article)>/gi, '\n');
  cleaned = cleaned.replace(/<br\s*[\/]?>/gi, '\n');

  // Strip remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x20B9;/g, '₹');

  // Normalize whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();

  return cleaned;
}

// Safe URL fetcher
export async function safeFetchUrl(urlStr: string, timeoutMs = 8000): Promise<{ text: string; title: string; html: string }> {
  const parsed = new URL(urlStr);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Invalid URL protocol. Only HTTP and HTTPS are permitted.');
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.startsWith('127.') ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.endsWith('.local')
  ) {
    throw new Error('Access to private network or local addresses is prohibited.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(urlStr, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 InfoGuard/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Official server responded with HTTP status ${response.status} (${response.statusText})`);
    }

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : parsed.hostname;
    const text = extractTextFromHtml(html);

    return { text, title, html };
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out while fetching official website.');
    }
    throw new Error(err.message || 'Unable to connect to source URL.');
  }
}

// Discover official sources from a primary official website
export async function discoverOfficialSources(primaryUrlStr: string): Promise<ScholarshipSource[]> {
  const parsed = new URL(primaryUrlStr);
  const baseDomain = parsed.hostname.toLowerCase();

  const { html, text } = await safeFetchUrl(primaryUrlStr, 9000);

  const discovered: ScholarshipSource[] = [];
  const seenUrls = new Set<string>();
  seenUrls.add(primaryUrlStr);

  // Regex to extract anchor tags with href and text
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  const officialKeywords = [
    'notification',
    'circular',
    'guideline',
    'guidelines',
    'faq',
    'faqs',
    'apply',
    'portal',
    'instruction',
    'scheme',
    'eligibility',
    'criteria',
    'advertisement',
    'brochure',
    'user manual',
    'helpdesk',
    'announcement',
  ];

  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1];
    const linkText = extractTextFromHtml(match[2]).trim();

    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) {
      continue;
    }

    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(rawHref, primaryUrlStr).toString();
    } catch {
      continue;
    }

    // Don't re-add
    if (seenUrls.has(absoluteUrl)) continue;

    // Check authority
    if (!isAuthoritativeDomain(absoluteUrl, baseDomain)) {
      continue;
    }

    const lowerHref = rawHref.toLowerCase();
    const lowerText = linkText.toLowerCase();

    // Check if relevant keyword matches
    const isRelevant = officialKeywords.some((kw) => lowerHref.includes(kw) || lowerText.includes(kw));
    const isPdf = lowerHref.endsWith('.pdf');

    if (isRelevant || isPdf) {
      seenUrls.add(absoluteUrl);

      let type: SourceType = 'webpage';
      let tier: AuthorityTier = 'Official Scholarship Webpage';

      if (isPdf || lowerHref.includes('notification') || lowerText.includes('notification')) {
        type = 'notification';
        tier = 'Official Issued Notification';
      } else if (lowerHref.includes('circular') || lowerText.includes('circular')) {
        type = 'circular';
        tier = 'Official Application Form / Circular';
      } else if (lowerHref.includes('faq') || lowerText.includes('faq')) {
        type = 'faq';
        tier = 'Official FAQ / Help Page';
      } else if (lowerHref.includes('portal') || lowerHref.includes('apply') || lowerText.includes('apply online')) {
        type = 'portal';
        tier = 'Current Official Application Portal';
      }

      const name = linkText.length > 3 ? linkText : isPdf ? 'Official Notification (PDF)' : `${type.toUpperCase()} Guidelines`;

      discovered.push({
        id: `discovered-${discovered.length + 1}`,
        name: name.slice(0, 80),
        url: absoluteUrl,
        type,
        authorityTier: tier,
        isDiscovered: true,
        domain: new URL(absoluteUrl).hostname,
        notes: `Automatically discovered on official domain (${baseDomain})`,
      });

      // Cap at 6 high-confidence discovered sources
      if (discovered.length >= 6) break;
    }
  }

  return discovered;
}
