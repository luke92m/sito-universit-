'use strict';

const universityDirectory = require('../data/university-directory.json');

const UNIVERSITY_BY_ID = new Map(universityDirectory.map((entry) => [entry.id, entry]));
const USER_AGENT = 'UniversitaSempliceBot/1.0 (+https://vercel.com; educational deadline and course resolver)';

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}

function stripHtml(html) {
  return decodeEntities(String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function rootDomain(hostname) {
  const parts = String(hostname || '').toLowerCase().split('.').filter(Boolean);
  return parts.length > 2 ? parts.slice(-2).join('.') : parts.join('.');
}

function isAllowedUrl(candidate, officialUrl) {
  try {
    const parsed = new URL(candidate);
    const official = new URL(officialUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    return rootDomain(parsed.hostname) === rootDomain(official.hostname);
  } catch (_error) {
    return false;
  }
}

function absoluteUrl(value, baseUrl) {
  try {
    return new URL(decodeEntities(value), baseUrl).href;
  } catch (_error) {
    return null;
  }
}

async function fetchText(url, options = {}) {
  const timeout = Number(options.timeout) || 4500;
  const maxChars = Number(options.maxChars) || 1500000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml,text/xml,text/plain;q=0.9,*/*;q=0.5'
      }
    });
    if (!response.ok) return null;
    const text = (await response.text()).slice(0, maxChars);
    return {
      url: response.url,
      text,
      contentType: response.headers.get('content-type') || ''
    };
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractLocs(xml, baseUrl) {
  const locations = [];
  const regex = /<loc\b[^>]*>([\s\S]*?)<\/loc>/gi;
  let match;
  while ((match = regex.exec(xml))) {
    const url = absoluteUrl(match[1].trim(), baseUrl);
    if (url) locations.push(url);
  }
  return locations;
}

function extractLinks(html, baseUrl) {
  const links = [];
  const regex = /\bhref\s*=\s*["']([^"'#]+)["']/gi;
  let match;
  while ((match = regex.exec(html))) {
    const url = absoluteUrl(match[1], baseUrl);
    if (url) links.push(url);
  }
  return links;
}

function sitemapPriority(url) {
  const text = normalize(url);
  let score = 0;
  if (/2026|2027/.test(text)) score += 5;
  if (/page|post|course|corso|study|student|didatt/.test(text)) score += 4;
  if (/image|video|tag|author|attachment/.test(text)) score -= 7;
  return score;
}

async function collectSiteUrls(officialUrl, options = {}) {
  const maxSitemaps = Number(options.maxSitemaps) || 7;
  const maxUrls = Number(options.maxUrls) || 5000;
  const maxDurationMs = Number(options.maxDurationMs) || 9000;
  const startedAt = Date.now();
  const base = new URL(officialUrl);
  const discovered = new Set([officialUrl]);
  const queue = [];
  const queued = new Set();

  const pushSitemap = (url) => {
    if (!url || queued.has(url) || !isAllowedUrl(url, officialUrl)) return;
    queued.add(url);
    queue.push(url);
  };

  const robotsUrl = new URL('/robots.txt', base).href;
  const robots = await fetchText(robotsUrl, { timeout: 3000, maxChars: 250000 });
  if (robots) {
    const regex = /^\s*Sitemap:\s*(\S+)\s*$/gim;
    let match;
    while ((match = regex.exec(robots.text))) pushSitemap(absoluteUrl(match[1], robots.url));
  }

  ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml', '/wp-sitemap.xml']
    .forEach((path) => pushSitemap(new URL(path, base).href));

  let processed = 0;
  while (queue.length && processed < maxSitemaps && discovered.size < maxUrls && Date.now() - startedAt < maxDurationMs) {
    queue.sort((a, b) => sitemapPriority(b) - sitemapPriority(a));
    const sitemapUrl = queue.shift();
    processed += 1;
    const remaining = Math.max(900, maxDurationMs - (Date.now() - startedAt));
    const result = await fetchText(sitemapUrl, { timeout: Math.min(3200, remaining), maxChars: 2500000 });
    if (!result || !/xml|text/i.test(result.contentType + result.text.slice(0, 100))) continue;
    const locations = extractLocs(result.text, result.url);
    const isIndex = /<sitemapindex\b/i.test(result.text);
    if (isIndex) {
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

function significantTokens(value) {
  const stop = new Set([
    'corso', 'corsi', 'laurea', 'lauree', 'degli', 'delle', 'della', 'dello', 'dell', 'alla', 'alle',
    'per', 'con', 'and', 'the', 'of', 'in', 'di', 'a', 'e', 'ed', 'un', 'una', 'magistrale', 'triennale',
    'abilitante', 'professione', 'professioni', 'scienze', 'studi'
  ]);
  return normalize(value).split(' ').filter((token) => token.length >= 3 && !stop.has(token));
}

function scoreTokenMatches(text, tokens) {
  const normalized = normalize(text);
  if (!normalized || !tokens.length) return 0;
  return tokens.reduce((score, token) => score + (normalized.includes(token) ? Math.min(7, 2 + Math.floor(token.length / 3)) : 0), 0);
}

function getUniversity(universityId) {
  return UNIVERSITY_BY_ID.get(universityId) || null;
}

function json(res, status, payload, cache = 's-maxage=21600, stale-while-revalidate=86400') {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', cache);
  res.end(JSON.stringify(payload));
}

module.exports = {
  UNIVERSITY_BY_ID,
  absoluteUrl,
  collectSiteUrls,
  decodeEntities,
  extractLinks,
  fetchText,
  first,
  getUniversity,
  isAllowedUrl,
  json,
  normalize,
  rootDomain,
  scoreTokenMatches,
  significantTokens,
  stripHtml
};
