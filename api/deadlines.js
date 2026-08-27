'use strict';

const {
  collectSiteUrls,
  fetchText,
  first,
  getUniversity,
  isAllowedUrl,
  json,
  normalize,
  scoreTokenMatches,
  significantTokens,
  stripHtml
} = require('./_shared');

const REGIONAL_PORTALS = {
  Abruzzo: { name: 'Diritto allo studio Abruzzo', url: 'https://www.regione.abruzzo.it/content/diritto-allo-studio-universitario' },
  Basilicata: { name: 'ARDSU Basilicata', url: 'https://www.ardsubasilicata.it/' },
  Calabria: { name: 'Regione Calabria — diritto allo studio', url: 'https://www.regione.calabria.it/' },
  Campania: { name: 'ADISURC Campania', url: 'https://www.adisurcampania.it/' },
  'Emilia-Romagna': { name: 'ER.GO', url: 'https://www.er-go.it/' },
  'Friuli-Venezia Giulia': { name: 'ARDiS FVG', url: 'https://www.ardis.fvg.it/' },
  Lazio: { name: 'DiSCo Lazio', url: 'https://www.laziodisco.it/' },
  Liguria: { name: 'ALiSEO Liguria', url: 'https://www.aliseo.liguria.it/' },
  Lombardia: { name: 'Regione Lombardia — università', url: 'https://www.regione.lombardia.it/' },
  Marche: { name: 'ERDIS Marche', url: 'https://erdis.it/' },
  Molise: { name: 'Università del Molise — diritto allo studio', url: 'https://www.unimol.it/' },
  Piemonte: { name: 'EDISU Piemonte', url: 'https://www.edisu.piemonte.it/' },
  Puglia: { name: 'ADISU Puglia', url: 'https://adisupuglia.it/' },
  Sardegna: { name: 'Regione Sardegna — diritto allo studio', url: 'https://www.regione.sardegna.it/' },
  Sicilia: { name: 'Regione Siciliana — diritto allo studio', url: 'https://www.regione.sicilia.it/' },
  Toscana: { name: 'DSU Toscana', url: 'https://www.dsu.toscana.it/' },
  'Trentino-Alto Adige/Südtirol': { name: 'Diritto allo studio Trentino-Alto Adige', url: 'https://www.provincia.tn.it/' },
  Umbria: { name: 'ADiSU Umbria', url: 'https://www.adisu.umbria.it/' },
  "Valle d'Aosta": { name: "Regione Valle d'Aosta — diritto allo studio", url: 'https://www.regione.vda.it/istruzione/' },
  Veneto: { name: 'Regione Veneto — diritto allo studio', url: 'https://www.regione.veneto.it/' }
};

const MONTHS = {
  gennaio: 1, feb: 2, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
  luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12
};

const ACTION_KEYWORDS = [
  'scadenza', 'scade', 'entro', 'termine', 'ultimo giorno', 'chiusura', 'apertura', 'domanda',
  'immatricol', 'iscrizion', 'ammission', 'graduatoria', 'pagament', 'rata', 'tasse', 'contribuz',
  'isee', 'ispe', 'bors', 'diritto allo studio', 'esame', 'appello', 'prenotaz', 'carriera', 'segreteria'
];

const URL_KEYWORDS = [
  'scaden', 'deadline', 'calendario', 'bando', 'immatricol', 'iscrizion', 'ammission', 'graduator',
  'tasse', 'contribuz', 'pagament', 'isee', 'bors', 'diritto-studio', 'esami', 'appelli', 'studenti'
];

function dateToIso(year, month, day) {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function inferYear(month, now) {
  const currentMonth = now.getUTCMonth() + 1;
  let year = now.getUTCFullYear();
  if (month < currentMonth - 2) year += 1;
  return year;
}

function collectDateMatches(text, now) {
  const results = [];
  const seenIndexes = new Set();
  const patterns = [
    {
      regex: /\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.]([0-2]?\d|3[01])\b/g,
      parse: (match) => dateToIso(match[1], match[2], match[3])
    },
    {
      regex: /\b([0-2]?\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/g,
      parse: (match) => dateToIso(match[3], match[2], match[1])
    },
    {
      regex: /\b([0-2]?\d|3[01])\s+(gennaio|feb(?:braio)?|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(20\d{2})\b/gi,
      parse: (match) => dateToIso(match[3], MONTHS[normalize(match[2])], match[1])
    },
    {
      regex: /\b([0-2]?\d|3[01])\s+(gennaio|feb(?:braio)?|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/gi,
      parse: (match) => {
        const month = MONTHS[normalize(match[2])];
        return dateToIso(inferYear(month, now), month, match[1]);
      }
    }
  ];

  patterns.forEach(({ regex, parse }) => {
    let match;
    while ((match = regex.exec(text))) {
      if (seenIndexes.has(match.index)) continue;
      const iso = parse(match);
      if (!iso) continue;
      seenIndexes.add(match.index);
      results.push({ iso, index: match.index, raw: match[0] });
    }
  });
  return results;
}

function surroundingText(text, index, rawLength) {
  const startFloor = Math.max(0, index - 260);
  const endCeil = Math.min(text.length, index + rawLength + 300);
  const fragment = text.slice(startFloor, endCeil);
  const localIndex = index - startFloor;
  const before = fragment.slice(0, localIndex);
  const after = fragment.slice(localIndex + rawLength);
  const sentenceStart = Math.max(before.lastIndexOf('.'), before.lastIndexOf(';'), before.lastIndexOf('|'), before.lastIndexOf('!'), before.lastIndexOf('?')) + 1;
  const sentenceEnds = [after.indexOf('.'), after.indexOf(';'), after.indexOf('|'), after.indexOf('!'), after.indexOf('?')].filter((value) => value >= 0);
  const sentenceEnd = sentenceEnds.length ? localIndex + rawLength + Math.min(...sentenceEnds) : fragment.length;
  return fragment.slice(sentenceStart, sentenceEnd).replace(/\s+/g, ' ').trim().slice(0, 360);
}

function classify(context) {
  const value = normalize(context);
  if (/bors|isee|ispe|diritto allo studio/.test(value)) return 'borsa';
  if (/rata|tasse|contribuz|pagament/.test(value)) return 'rata';
  if (/esame|appello|prenotaz/.test(value)) return 'esame';
  if (/test|tolc|ammission|graduator/.test(value)) return 'test';
  if (/immatricol|iscrizion|pre-iscriz/.test(value)) return 'immatricolazione';
  return 'burocrazia';
}

function cleanTitle(context, rawDate, category) {
  let title = String(context || '')
    .replace(rawDate, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[-–—:;,\s]+|[-–—:;,\s]+$/g, '')
    .trim();
  if (title.length > 150) title = `${title.slice(0, 147).trim()}…`;
  if (title.length < 12) {
    const labels = {
      borsa: 'Borsa di studio: verifica la scadenza ufficiale',
      rata: 'Pagamento della contribuzione universitaria',
      esame: 'Esame o prenotazione appello',
      test: 'Test di ingresso o graduatoria',
      immatricolazione: 'Immatricolazione o iscrizione',
      burocrazia: 'Adempimento universitario'
    };
    return labels[category] || labels.burocrazia;
  }
  return title;
}

function urlRelevance(url, courseName, mode) {
  const text = normalize(decodeURIComponent(url));
  let score = 0;
  URL_KEYWORDS.forEach((keyword) => { if (text.includes(keyword)) score += 4; });
  if (/2026|2027/.test(text)) score += 5;
  if (mode === 'enrolling' && /immatricol|ammission|iscrizion|bando|graduator/.test(text)) score += 7;
  if (mode === 'university' && /tasse|rata|esam|appell|carriera|calendario/.test(text)) score += 7;
  score += scoreTokenMatches(text, significantTokens(courseName));
  if (/\.(pdf|jpg|jpeg|png|gif|zip|docx?|xlsx?)($|\?)/i.test(url)) score -= 50;
  return score;
}

function eventsFromPage(page, meta, options) {
  const now = options.now;
  const plain = stripHtml(page.text);
  const tokens = significantTokens(options.courseName);
  const minDate = new Date(now);
  minDate.setUTCDate(minDate.getUTCDate() - 45);
  const maxDate = new Date(now);
  maxDate.setUTCDate(maxDate.getUTCDate() + 520);
  const pageNorm = normalize(plain.slice(0, 120000));
  const pageHasAction = ACTION_KEYWORDS.some((keyword) => pageNorm.includes(normalize(keyword)));
  const output = [];

  collectDateMatches(plain, now).forEach((match) => {
    const date = new Date(`${match.iso}T00:00:00Z`);
    if (date < minDate || date > maxDate) return;
    const context = surroundingText(plain, match.index, match.raw.length);
    const normalizedContext = normalize(context);
    const actionHits = ACTION_KEYWORDS.filter((keyword) => normalizedContext.includes(normalize(keyword)));
    const courseScore = scoreTokenMatches(normalizedContext, tokens);
    if (!actionHits.length && !courseScore && !pageHasAction) return;
    let score = meta.urlScore + actionHits.length * 5 + courseScore;
    if (/scadenza|scade|entro|termine|ultimo giorno|chiusura/.test(normalizedContext)) score += 12;
    if (/2026|2027/.test(match.raw)) score += 3;
    if (score < 8) return;
    const category = classify(context);
    output.push({
      id: `${meta.sourceType}-${match.iso}-${Buffer.from(page.url).toString('base64url').slice(0, 12)}-${match.index}`,
      date: match.iso,
      title: cleanTitle(context, match.raw, category),
      notes: context,
      category,
      sourceUrl: page.url,
      sourceLabel: meta.sourceLabel,
      sourceType: meta.sourceType,
      confidence: /scadenza|scade|entro|termine|ultimo giorno|chiusura/.test(normalizedContext) ? 'alta' : 'media',
      score
    });
  });
  return output;
}

function dedupeEvents(events) {
  const byKey = new Map();
  events.forEach((event) => {
    const titleKey = normalize(event.title).split(' ').slice(0, 9).join(' ');
    const key = `${event.date}|${event.category}|${titleKey}`;
    const current = byKey.get(key);
    if (!current || event.score > current.score) byKey.set(key, event);
  });
  return Array.from(byKey.values())
    .sort((a, b) => a.date.localeCompare(b.date) || b.score - a.score)
    .slice(0, 45)
    .map(({ score, ...event }) => event);
}

async function sourcePages(source, courseName, mode, limits) {
  const urls = await collectSiteUrls(source.url, {
    maxSitemaps: limits.maxSitemaps,
    maxUrls: limits.maxUrls,
    maxDurationMs: limits.maxDurationMs
  });
  const ranked = urls
    .map((url) => ({ url, score: urlRelevance(url, courseName, mode) }))
    .filter((entry) => entry.score > 0 && isAllowedUrl(entry.url, source.url))
    .sort((a, b) => b.score - a.score)
    .slice(0, limits.maxPages);
  if (!ranked.some((entry) => entry.url === source.url)) ranked.push({ url: source.url, score: 1 });

  const pages = await Promise.all(ranked.map(async (entry) => {
    const page = await fetchText(entry.url, { timeout: 2500, maxChars: 1100000 });
    return page ? { page, urlScore: entry.score } : null;
  }));
  return pages.filter(Boolean).map((entry) => ({
    ...entry,
    sourceLabel: source.label,
    sourceType: source.type
  }));
}

module.exports = async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    return json(res, 405, { error: 'Metodo non consentito.' }, 'no-store');
  }

  const universityId = String(first(req.query?.universityId) || '').trim();
  const courseName = String(first(req.query?.course) || '').trim().slice(0, 220);
  const mode = String(first(req.query?.situation) || '').trim() === 'enrolling' ? 'enrolling' : 'university';
  const university = getUniversity(universityId);
  if (!university) return json(res, 400, { error: 'Ateneo non valido.' }, 'no-store');

  const now = new Date();
  const sources = [{ type: 'ateneo', label: university.shortName || university.name, url: university.officialUrl }];
  const regional = REGIONAL_PORTALS[university.region];
  if (regional) sources.push({ type: 'diritto-studio', label: regional.name, url: regional.url });

  try {
    const pageGroups = await Promise.all(sources.map((source, index) => sourcePages(
      source,
      courseName,
      mode,
      index === 0
        ? { maxSitemaps: 5, maxUrls: 4200, maxPages: 6, maxDurationMs: 4200 }
        : { maxSitemaps: 3, maxUrls: 1600, maxPages: 3, maxDurationMs: 2600 }
    )));

    const pages = pageGroups.flat();
    const events = dedupeEvents(pages.flatMap((entry) => eventsFromPage(entry.page, entry, { now, courseName })));
    return json(res, 200, {
      generatedAt: now.toISOString(),
      university: { id: university.id, name: university.name, region: university.region },
      course: courseName || null,
      events,
      sourcesChecked: Array.from(new Set(pages.map((entry) => entry.page.url))),
      warning: events.length
        ? 'Le date sono state individuate automaticamente nelle fonti ufficiali. Apri sempre la fonte prima di agire: il riconoscimento automatico può omettere o interpretare male una data.'
        : 'Non sono state individuate date verificabili nelle pagine ufficiali analizzate. Il sistema non inventa scadenze: consulta il portale studenti e i bandi dell’ateneo.'
    }, 's-maxage=21600, stale-while-revalidate=86400');
  } catch (_error) {
    return json(res, 200, {
      generatedAt: now.toISOString(),
      university: { id: university.id, name: university.name, region: university.region },
      course: courseName || null,
      events: [],
      sourcesChecked: [],
      warning: 'La sincronizzazione automatica non è riuscita. Riprova oppure consulta il sito ufficiale dell’ateneo.'
    }, 's-maxage=900, stale-while-revalidate=3600');
  }
};
