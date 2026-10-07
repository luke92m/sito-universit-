// Porting di legacy/api/_shared.js: lettura delle pagine pubbliche dei siti ufficiali degli atenei.
import 'server-only';

import universityDirectory from '../data/university-directory.json';

export interface DirectoryEntry {
  id: string;
  name: string;
  shortName: string;
  city: string;
  region: string;
  officialUrl: string;
}

export interface FetchedPage {
  url: string;
  text: string;
  contentType: string;
}

const UNIVERSITY_BY_ID = new Map((universityDirectory as DirectoryEntry[]).map((entry) => [entry.id, entry]));
const USER_AGENT = 'UniversitaSempliceBot/1.0 (+https://vercel.com; educational deadline and course resolver)';

export function normalize(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

export function decodeEntities(value: unknown): string {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}

export function stripHtml(html: unknown): string {
  return decodeEntities(
    String(html || '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export function rootDomain(hostname: string): string {
  const parts = String(hostname || '')
    .toLowerCase()
    .split('.')
    .filter(Boolean);
  return parts.length > 2 ? parts.slice(-2).join('.') : parts.join('.');
}

/** Ammette solo URL http(s) dello stesso dominio ufficiale (niente richieste verso siti arbitrari). */
export function isAllowedUrl(candidate: string, officialUrl: string): boolean {
  try {
    const parsed = new URL(candidate);
    const official = new URL(officialUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    return rootDomain(parsed.hostname) === rootDomain(official.hostname);
  } catch {
    return false;
  }
}

export function absoluteUrl(value: string, baseUrl: string): string | null {
  try {
    return new URL(decodeEntities(value), baseUrl).href;
  } catch {
    return null;
  }
}

export async function fetchText(
  url: string,
  options: { timeout?: number; maxChars?: number } = {}
): Promise<FetchedPage | null> {
  const timeout = Number(options.timeout) || 4500;
  const maxChars = Number(options.maxChars) || 1500000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml,text/xml,text/plain;q=0.9,*/*;q=0.5'
      }
    });
    if (!response.ok) return null;
    const text = (await response.text()).slice(0, maxChars);
    return { url: response.url, text, contentType: response.headers.get('content-type') || '' };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractLocs(xml: string, baseUrl: string): string[] {
  const locations: string[] = [];
  const regex = /<loc\b[^>]*>([\s\S]*?)<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml))) {
    const url = absoluteUrl(match[1].trim(), baseUrl);
    if (url) locations.push(url);
  }
  return locations;
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const regex = /\bhref\s*=\s*["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const url = absoluteUrl(match[1], baseUrl);
    if (url) links.push(url);
  }
  return links;
}

function sitemapPriority(url: string): number {
  const text = normalize(url);
  let score = 0;
  if (/2026|2027/.test(text)) score += 5;
  if (/page|post|course|corso|study|student|didatt/.test(text)) score += 4;
  if (/image|video|tag|author|attachment/.test(text)) score -= 7;
  return score;
}

export async function collectSiteUrls(
  officialUrl: string,
  options: { maxSitemaps?: number; maxUrls?: number; maxDurationMs?: number } = {}
): Promise<string[]> {
  const maxSitemaps = Number(options.maxSitemaps) || 7;
  const maxUrls = Number(options.maxUrls) || 5000;
  const maxDurationMs = Number(options.maxDurationMs) || 9000;
  const startedAt = Date.now();
  const base = new URL(officialUrl);
  const discovered = new Set([officialUrl]);
  const queue: string[] = [];
  const queued = new Set<string>();

  const pushSitemap = (url: string | null) => {
    if (!url || queued.has(url) || !isAllowedUrl(url, officialUrl)) return;
    queued.add(url);
    queue.push(url);
  };

  const robots = await fetchText(new URL('/robots.txt', base).href, { timeout: 3000, maxChars: 250000 });
  if (robots) {
    const regex = /^\s*Sitemap:\s*(\S+)\s*$/gim;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(robots.text))) pushSitemap(absoluteUrl(match[1], robots.url));
  }

  ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml', '/wp-sitemap.xml'].forEach((path) =>
    pushSitemap(new URL(path, base).href)
  );

  let processed = 0;
  while (queue.length && processed < maxSitemaps && discovered.size < maxUrls && Date.now() - startedAt < maxDurationMs) {
    queue.sort((a, b) => sitemapPriority(b) - sitemapPriority(a));
    const sitemapUrl = queue.shift() as string;
    processed += 1;
    const remaining = Math.max(900, maxDurationMs - (Date.now() - startedAt));
    const result = await fetchText(sitemapUrl, { timeout: Math.min(3200, remaining), maxChars: 2500000 });
    if (!result || !/xml|text/i.test(result.contentType + result.text.slice(0, 100))) continue;
    const locations = extractLocs(result.text, result.url);
    if (/<sitemapindex\b/i.test(result.text)) {
      locations
        .filter((url) => isAllowedUrl(url, officialUrl))
        .sort((a, b) => sitemapPriority(b) - sitemapPriority(a))
        .slice(0, 18)
        .forEach(pushSitemap);
    } else {
      for (const url of locations) {
        if (discovered.size >= maxUrls) break;
        if (isAllowedUrl(url, officialUrl)) discovered.add(url);
      }
    }
  }

  if (discovered.size < 20 && Date.now() - startedAt < maxDurationMs) {
    const homepage = await fetchText(officialUrl, { timeout: 4200, maxChars: 1000000 });
    if (homepage) {
      extractLinks(homepage.text, homepage.url)
        .filter((url) => isAllowedUrl(url, officialUrl))
        .slice(0, 600)
        .forEach((url) => discovered.add(url));
    }
  }

  return Array.from(discovered);
}

export function significantTokens(value: unknown): string[] {
  const stop = new Set([
    'corso', 'corsi', 'laurea', 'lauree', 'degli', 'delle', 'della', 'dello', 'dell', 'alla', 'alle',
    'per', 'con', 'and', 'the', 'of', 'in', 'di', 'a', 'e', 'ed', 'un', 'una', 'magistrale', 'triennale',
    'abilitante', 'professione', 'professioni', 'scienze', 'studi'
  ]);
  return normalize(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !stop.has(token));
}

export function scoreTokenMatches(text: unknown, tokens: string[]): number {
  const normalized = normalize(text);
  if (!normalized || !tokens.length) return 0;
  return tokens.reduce(
    (score, token) => score + (normalized.includes(token) ? Math.min(7, 2 + Math.floor(token.length / 3)) : 0),
    0
  );
}

export function getDirectoryUniversity(universityId: string): DirectoryEntry | null {
  return UNIVERSITY_BY_ID.get(universityId) || null;
}

/** Decodifica di un URL tollerante a sequenze percentuali non valide (la v8 qui lanciava un errore). */
export function safeDecode(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}
