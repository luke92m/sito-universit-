'use strict';

const {
  collectSiteUrls,
  fetchText,
  first,
  getUniversity,
  isAllowedUrl,
  json,
  normalize,
  stripHtml
} = require('./_shared');

const REGIONAL_PORTALS = {
  Abruzzo: 'https://www.adsuchietipescara.it/',
  Basilicata: 'https://www.ardsubasilicata.it/',
  Calabria: 'https://www.regione.calabria.it/website/organizzazione/dipartimento10/',
  Campania: 'https://www.adisurcampania.it/',
  'Emilia-Romagna': 'https://www.er-go.it/',
  'Friuli-Venezia Giulia': 'https://www.ardis.fvg.it/',
  Lazio: 'https://www.laziodisco.it/',
  Liguria: 'https://www.alfaliguria.it/',
  Lombardia: 'https://www.regione.lombardia.it/',
  Marche: 'https://erdis.it/',
  Molise: 'https://www.esu.molise.it/',
  Piemonte: 'https://www.edisu.piemonte.it/',
  Puglia: 'https://www.adisupuglia.it/',
  Sardegna: 'https://www.ersucagliari.it/',
  Sicilia: 'https://www.ersupalermo.it/',
  Toscana: 'https://www.dsu.toscana.it/',
  'Trentino-Alto Adige/Südtirol': 'https://www.provincia.tn.it/',
  Umbria: 'https://www.adisu.umbria.it/',
  "Valle d'Aosta": 'https://www.regione.vda.it/istruzione/',
  Veneto: 'https://www.regione.veneto.it/'
};

const POSITIVE = ['borsa', 'borse', 'scholarship', 'financial aid', 'diritto allo studio', 'agevolazioni', 'benefici', 'esoneri', 'contributi', 'student support'];
const NEGATIVE = ['news', 'notizie', 'evento', 'eventi', 'tag', 'author', 'ricerca', 'research', 'alumni', 'staff'];

function urlScore(url) {
  const text = normalize(decodeURIComponent(url));
  let score = 0;
  POSITIVE.forEach((term) => { if (text.includes(normalize(term))) score += term.includes('bors') || term.includes('scholar') ? 10 : 5; });
  NEGATIVE.forEach((term) => { if (text.includes(term)) score -= 5; });
  if (/2026|2027/.test(text)) score += 3;
  if (/student|studente|studenti/.test(text)) score += 2;
  if (/\.(pdf|jpg|jpeg|png|gif|zip|docx?|xlsx?)($|\?)/i.test(url)) score -= 30;
  return score;
}

function pageScore(page, baseScore) {
  const title = stripHtml(page.text.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const h1 = stripHtml(page.text.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  const body = stripHtml(page.text).slice(0, 45000);
  const combined = normalize(`${title} ${h1} ${body}`);
  let score = baseScore;
  POSITIVE.forEach((term) => {
    const clean = normalize(term);
    if (normalize(title).includes(clean) || normalize(h1).includes(clean)) score += 18;
    else if (combined.includes(clean)) score += 5;
  });
  if (/requisiti|isee|ispe|domanda|scadenza|bando/.test(combined)) score += 8;
  return score;
}

async function resolveFromSource(sourceUrl) {
  const urls = await collectSiteUrls(sourceUrl, { maxSitemaps: 6, maxUrls: 5200, maxDurationMs: 4500 });
  const ranked = urls
    .map((url) => ({ url, score: urlScore(url) }))
    .filter((entry) => entry.score > 0 && isAllowedUrl(entry.url, sourceUrl))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const inspected = await Promise.all(ranked.slice(0, 7).map(async (entry) => {
    const page = await fetchText(entry.url, { timeout: 2600, maxChars: 900000 });
    return { ...entry, pageScore: page ? pageScore(page, entry.score) : entry.score };
  }));
  inspected.sort((a, b) => b.pageScore - a.pageScore);
  return inspected[0]?.pageScore >= 20 ? inspected[0] : null;
}

module.exports = async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) return json(res, 405, { error: 'Metodo non consentito.' }, 'no-store');
  const universityId = String(first(req.query?.universityId) || '').trim();
  const format = String(first(req.query?.format) || '').trim();
  const university = getUniversity(universityId);
  if (!university) return json(res, 400, { error: 'Ateneo non valido.' }, 'no-store');

  const regionalUrl = REGIONAL_PORTALS[university.region] || null;
  let resolvedUrl = regionalUrl || university.officialUrl;
  let resolution = regionalUrl ? 'regional-portal' : 'university-homepage';
  let confidence = 'low';

  try {
    const universityPage = await resolveFromSource(university.officialUrl);
    if (universityPage) {
      resolvedUrl = universityPage.url;
      resolution = 'university-scholarship-page';
      confidence = universityPage.pageScore >= 48 ? 'high' : 'medium';
    } else if (regionalUrl) {
      const regionalPage = await resolveFromSource(regionalUrl);
      if (regionalPage) {
        resolvedUrl = regionalPage.url;
        resolution = 'regional-scholarship-page';
        confidence = regionalPage.pageScore >= 48 ? 'high' : 'medium';
      }
    }
  } catch (_error) {
    resolvedUrl = regionalUrl || university.officialUrl;
  }

  const allowedSource = resolvedUrl.startsWith(university.officialUrl) ? university.officialUrl : regionalUrl;
  if (allowedSource && !isAllowedUrl(resolvedUrl, allowedSource)) resolvedUrl = allowedSource;

  if (format === 'json') {
    return json(res, 200, {
      universityId,
      university: university.name,
      url: resolvedUrl,
      resolution,
      confidence
    }, 's-maxage=604800, stale-while-revalidate=2592000');
  }

  res.statusCode = 302;
  res.setHeader('location', resolvedUrl);
  res.setHeader('cache-control', 's-maxage=604800, stale-while-revalidate=2592000');
  res.end();
};
