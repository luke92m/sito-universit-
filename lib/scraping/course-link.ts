// Porting di legacy/api/course-link.js: individua la pagina ufficiale di un corso sul sito dell'ateneo.
import 'server-only';

import {
  collectSiteUrls,
  fetchText,
  isAllowedUrl,
  normalize,
  safeDecode,
  scoreTokenMatches,
  significantTokens,
  stripHtml,
  type DirectoryEntry,
  type FetchedPage
} from './shared';

const PAGE_HINTS = ['corso', 'corsi', 'laurea', 'degree', 'study', 'didattica', 'offerta', 'programme', 'program'];
const NEGATIVE_HINTS = ['news', 'notizie', 'evento', 'eventi', 'tag', 'author', 'alumni', 'ricerca', 'research', 'docenti', 'staff'];

function urlScore(url: string, courseName: string, classCode: string): number {
  const text = normalize(safeDecode(url));
  const tokens = significantTokens(courseName);
  let score = scoreTokenMatches(text, tokens);
  if (tokens.length && tokens.every((token) => text.includes(token))) score += 18;
  if (normalize(courseName) && text.includes(normalize(courseName))) score += 28;
  if (classCode && text.includes(normalize(classCode))) score += 10;
  PAGE_HINTS.forEach((hint) => {
    if (text.includes(hint)) score += 3;
  });
  NEGATIVE_HINTS.forEach((hint) => {
    if (text.includes(hint)) score -= 4;
  });
  if (/\.(pdf|jpg|jpeg|png|gif|zip|docx?|xlsx?)($|\?)/i.test(url)) score -= 40;
  return score;
}

function pageScore(page: FetchedPage, courseName: string, classCode: string, baseScore: number) {
  const title = stripHtml(page.text.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const h1 = stripHtml(page.text.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  const body = stripHtml(page.text).slice(0, 50000);
  const tokens = significantTokens(courseName);
  let score = baseScore;
  score += scoreTokenMatches(title, tokens) * 4;
  score += scoreTokenMatches(h1, tokens) * 4;
  score += scoreTokenMatches(body, tokens);
  if (normalize(title).includes(normalize(courseName))) score += 35;
  if (normalize(h1).includes(normalize(courseName))) score += 40;
  if (classCode && normalize(body).includes(normalize(classCode))) score += 12;
  if (/ammission|immatricol|iscrizion|piano degli studi|obiettivi formativi|insegnamenti/i.test(body)) score += 8;
  return { score, title: title || h1 };
}

function bestCatalogUrl(urls: string[], officialUrl: string): string {
  const hints = ['offerta-formativa', 'corsi-di-studio', 'corsi-di-laurea', 'study-programmes', 'degree-programmes', 'didattica/corsi'];
  const candidates = urls
    .map((url) => ({
      url,
      score: hints.reduce((score, hint) => score + (normalize(url).includes(normalize(hint)) ? 8 : 0), 0)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.url || officialUrl;
}

export interface CourseLinkResult {
  url: string;
  resolution: 'course-page' | 'course-catalog' | 'homepage';
  confidence: 'high' | 'medium' | 'low';
}

export async function resolveCourseLink(university: DirectoryEntry, courseName: string, classCode: string): Promise<CourseLinkResult> {
  let resolvedUrl = university.officialUrl;
  let resolution: CourseLinkResult['resolution'] = 'homepage';
  let confidence: CourseLinkResult['confidence'] = 'low';

  try {
    const urls = await collectSiteUrls(university.officialUrl, { maxSitemaps: 6, maxUrls: 5200, maxDurationMs: 4500 });
    const ranked = urls
      .map((url) => ({ url, score: urlScore(url, courseName, classCode) }))
      .filter((entry) => entry.score > 0 && isAllowedUrl(entry.url, university.officialUrl))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    const inspected = await Promise.all(
      ranked.slice(0, 7).map(async (entry) => {
        const page = await fetchText(entry.url, { timeout: 2600, maxChars: 1000000 });
        if (!page) return { ...entry, pageScore: entry.score, title: '' };
        const scored = pageScore(page, courseName, classCode, entry.score);
        return { ...entry, pageScore: scored.score, title: scored.title };
      })
    );

    inspected.sort((a, b) => b.pageScore - a.pageScore);
    const best = inspected[0];
    if (best && best.pageScore >= 28) {
      resolvedUrl = best.url;
      resolution = 'course-page';
      confidence = best.pageScore >= 65 ? 'high' : 'medium';
    } else {
      resolvedUrl = bestCatalogUrl(urls, university.officialUrl);
      resolution = resolvedUrl === university.officialUrl ? 'homepage' : 'course-catalog';
    }
  } catch {
    resolvedUrl = university.officialUrl;
  }

  if (!isAllowedUrl(resolvedUrl, university.officialUrl)) resolvedUrl = university.officialUrl;
  return { url: resolvedUrl, resolution, confidence };
}
