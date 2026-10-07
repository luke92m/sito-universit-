// Porting della logica di punteggio di legacy/js/university-finder.js ("Trova la mia università").
// Gira solo sul server: usa l'intero dataset corsi.
import { FINDER_DATA as finderData, STUDENT_SERVICES as serviceData, UNIVERSITIES, getCourses, getMetrics } from '../data';
import type { Course, CourseProfile, University } from '../types';
import { COURSES, getCourseProfile, matchCourse } from './course-catalog';
import { getIseeRange } from './isee';
import { forTarget, type RankingResult } from './official-rankings';
import { clamp, normalize } from './text';

export type Degree = 'bachelor' | 'single' | 'master' | 'undecided';

export interface FinderAnswers {
  courseChoice: string;
  degree: Degree | string;
  residenceRegion: string;
  residenceCity: string;
  commute: 'yes' | 'no' | string;
  relocation: 'none' | 'region' | 'neighbors' | 'italy' | string;
  iseeRange: string;
  language: 'italian' | 'english' | 'either' | string;
}

export interface FinderTarget {
  type: 'course' | 'group';
  label: string;
  group: string;
  profile: CourseProfile | null;
}

export interface CourseMatch {
  score: number;
  tier: 'exact' | 'close' | 'class' | 'macro' | 'group' | 'none';
  label: string;
  reason: string;
  similarity: number;
  classHit: boolean;
}

export interface CommuteEstimate {
  minutes: number | null;
  precision: 'city' | 'region' | 'unknown';
}

export interface GeographyFit {
  allowed: boolean;
  score: number;
  label: string;
  commute: CommuteEstimate | null;
  online: boolean;
  sameCity: boolean;
  mode: 'online' | 'home' | 'commute' | 'relocation' | 'excluded';
}

export interface SupportResult {
  score: number;
  agency: string;
  raw: ReturnType<typeof supportRawMetrics>;
  breakdown: {
    beneficiary: number;
    quality: number;
    housing: number;
    exemptions: number;
    regional: number;
    isee: number;
    merit: number;
  };
  note: string;
}

export interface CostResult {
  score: number;
  tuition: number;
  cityCost: { monthly: number; rent: number; tier: string; estimated: boolean };
  annual: number;
  budget: number;
  ratio: number;
  online: boolean;
  needsAid: boolean;
  support: number;
}

export interface LanguageFit {
  score: number;
  inferred: 'english' | 'italian';
  label: string;
}

export type WeightKey = 'course' | 'geography' | 'ranking' | 'cost' | 'language' | 'support';

export interface FinderResult {
  university: University;
  course: Course;
  courseMatch: CourseMatch;
  geography: GeographyFit;
  cost: CostResult;
  ranking: RankingResult;
  language: LanguageFit;
  support: SupportResult;
  weights: Record<WeightKey, number>;
  contributions: Record<WeightKey, number>;
  totalRaw: number;
  total: number;
  target: FinderTarget;
}

export const DEGREE_LABELS: Record<string, string> = {
  bachelor: 'Laurea triennale',
  single: 'Laurea magistrale a ciclo unico',
  master: 'Laurea magistrale biennale',
  undecided: 'Non l’ho ancora deciso'
};

const MATCH_TIER_LABELS = {
  exact: 'Corrispondenza esatta',
  close: 'Corrispondenza molto vicina',
  class: 'Stessa classe, focus diverso',
  macro: 'Solo stessa macroarea',
  group: 'Coerente con la macroarea scelta'
};

const REGIONAL_SUPPORT_AGENCIES: Record<string, string> = {
  Abruzzo: 'ADSU territoriali',
  Basilicata: 'ARDSU Basilicata',
  Calabria: 'Enti regionali per il diritto allo studio',
  Campania: 'ADISURC',
  'Emilia-Romagna': 'ER.GO',
  'Friuli-Venezia Giulia': 'ARDiS FVG',
  Lazio: 'DiSCo Lazio',
  Liguria: 'ALiSEO',
  Lombardia: 'Diritto allo studio degli atenei lombardi',
  Marche: 'ERDIS Marche',
  Molise: 'ESU Molise',
  Piemonte: 'EDISU Piemonte',
  Puglia: 'ADISU Puglia',
  Sardegna: 'ERSU territoriali',
  Sicilia: 'ERSU territoriali',
  Toscana: 'DSU Toscana',
  'Trentino-Alto Adige/Südtirol': 'Opera Universitaria / enti provinciali',
  Umbria: 'ADiSU Umbria',
  "Valle d'Aosta": 'Regione Valle d’Aosta',
  Veneto: 'ESU territoriali'
};

const COURSE_TOKEN_STOPWORDS = new Set([
  'a', 'ad', 'al', 'alla', 'alle', 'con', 'da', 'dal', 'dalla', 'de', 'dei', 'del', 'della', 'delle',
  'di', 'e', 'ed', 'for', 'in', 'il', 'la', 'le', 'lo', 'of', 'per', 'the', 'un', 'una', 'and',
  'corso', 'laurea', 'scienze', 'science', 'studi', 'studies'
]);

/** Atenei in ordine alfabetico italiano, come in getUniversities() della versione legacy. */
function sortedUniversities(): University[] {
  return UNIVERSITIES.slice().sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

function sortedCourses(universityId: string): Course[] {
  return getCourses(universityId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

export function targetFromChoice(choice: string): FinderTarget | null {
  if (choice.startsWith('course:')) {
    const profile = getCourseProfile(choice.slice(7));
    return profile ? { type: 'course', label: profile.name, group: profile.group, profile } : null;
  }
  if (choice.startsWith('group:')) {
    const group = choice.slice(6);
    return group ? { type: 'group', label: group, group, profile: null } : null;
  }
  return null;
}

/** Macroaree selezionabili nel finder, in ordine alfabetico. */
export function finderGroups(): string[] {
  return Array.from(new Set(COURSES.map((course) => course.group))).sort((a, b) => a.localeCompare(b, 'it'));
}

function isCycleUnique(course: Course): boolean {
  const code = String(course.classCode || '')
    .toUpperCase()
    .replace(/\s/g, '');
  return course.level === 'ciclo-unico' || /^(LMG\/01|LM-4CU|LM-41|LM-42|LM-13)/.test(code);
}

export function degreeMatches(course: Course, degree: string): boolean {
  if (degree === 'undecided') return true;
  const cycle = isCycleUnique(course);
  if (degree === 'single') return cycle;
  if (degree === 'master') return course.level === 'magistrale' && !cycle;
  if (degree === 'bachelor') {
    return (
      course.level === 'triennale' ||
      (!cycle && /^L(?:-|\/|\d)/i.test(String(course.classCode || '')) && !/^LM/i.test(String(course.classCode || '')))
    );
  }
  return true;
}

export function inferCourseLanguage(course: Pick<Course, 'name'>): 'english' | 'italian' {
  const name = normalize(course.name);
  const englishHits = [
    'engineering', 'economics', 'business', 'finance', 'international', 'computer', 'data science',
    'medicine and surgery', 'psychology', 'management engineering', 'global', 'sustainable', 'food science', 'design and'
  ].filter((term) => name.includes(term)).length;
  const italianHits = [
    'scienze', 'ingegneria', 'economia', 'laurea', 'della', 'delle', 'degli', 'medicina e', 'giurisprudenza'
  ].filter((term) => name.includes(term)).length;
  return englishHits > italianHits && englishHits > 0 ? 'english' : 'italian';
}

function cleanCourseTitle(value: unknown): string {
  return normalize(String(value || '').replace(/\([^)]*\)/g, ' '));
}

function normalizedClassCode(value: unknown): string {
  return String(value || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[–—]/g, '-');
}

function titleTokens(value: unknown): Set<string> {
  return new Set(
    cleanCourseTitle(value)
      .split(' ')
      .filter((token) => token.length > 1 && !COURSE_TOKEN_STOPWORDS.has(token))
  );
}

function setSimilarity(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((token) => {
    if (right.has(token)) intersection += 1;
  });
  return intersection / Math.max(left.size, right.size);
}

export function isDistanceCourse(course: Pick<Course, 'delivery'> | null | undefined): boolean {
  const delivery = normalize(course?.delivery);
  return delivery.includes('distanza') || delivery.includes('online') || delivery.includes('telematic');
}

export function courseMatch(course: Course, target: FinderTarget): CourseMatch {
  if (!course || course.group !== target.group) {
    return { score: 0, tier: 'none', label: 'Non coerente', reason: 'Macroarea differente.', similarity: 0, classHit: false };
  }

  if (target.type === 'group') {
    const matched = matchCourse(course);
    const specificity = matched?.group === target.group ? 1 : 0;
    const score =
      68 + Math.min(6, specificity * 3 + Math.round(Math.log10(Math.max(1, Number(course.enrolled || 0))) * 0.8));
    return {
      score: clamp(score, 60, 74),
      tier: 'group',
      label: MATCH_TIER_LABELS.group,
      reason: `Il corso appartiene alla macroarea ${target.group}; il punteggio varia in base alla specificità del titolo.`,
      similarity: 0,
      classHit: false
    };
  }

  const profile = target.profile as CourseProfile;
  const title = cleanCourseTitle(course.name);
  const canonical = cleanCourseTitle(profile.name);
  const aliases = [profile.name, ...(profile.keywords || [])].map(cleanCourseTitle).filter(Boolean);
  const titleTokenSet = titleTokens(course.name);
  const canonicalTokens = titleTokens(profile.name);
  const profileTokenSet = new Set(aliases.flatMap((alias) => Array.from(titleTokens(alias))));
  const canonicalSimilarity = setSimilarity(titleTokenSet, canonicalTokens);
  const profileSimilarity = setSimilarity(titleTokenSet, profileTokenSet);
  const similarity = Math.max(canonicalSimilarity, profileSimilarity);
  const exactCanonical = title === canonical;
  const exactAlias = aliases.some((alias) => title === alias);
  const containedAlias = aliases
    .filter((alias) => alias.split(' ').length >= 2)
    .sort((a, b) => b.length - a.length)
    .find((alias) => title.includes(alias));
  const courseClass = normalizedClassCode(course.classCode);
  const classHit = (profile.classCodes || []).some((code) => {
    const expected = normalizedClassCode(code);
    return courseClass === expected || courseClass.startsWith(`${expected}/`) || courseClass.startsWith(`${expected}-`);
  });
  const matched = matchCourse(course);
  const catalogHit = matched?.slug === profile.slug;

  const classRequired = Boolean(profile.classCodes?.length);
  const classCompatible = !classRequired || classHit;

  if ((exactCanonical || exactAlias) && classCompatible) {
    return {
      score: 100,
      tier: 'exact',
      label: MATCH_TIER_LABELS.exact,
      reason: `Il titolo del corso coincide con “${profile.name}” o con una denominazione pienamente equivalente, nella classe di laurea attesa.`,
      classHit,
      similarity
    };
  }

  if ((exactCanonical || exactAlias) && !classCompatible) {
    return {
      score: 90,
      tier: 'close',
      label: MATCH_TIER_LABELS.close,
      reason: 'Il titolo coincide, ma la classe di laurea è diversa da quella normalmente associata al corso scelto.',
      classHit,
      similarity
    };
  }

  if ((containedAlias && classHit) || (catalogHit && classHit && similarity >= 0.6)) {
    const score = Math.round(clamp(90 + similarity * 5, 90, 95));
    return {
      score,
      tier: 'close',
      label: MATCH_TIER_LABELS.close,
      reason: containedAlias
        ? `Il titolo contiene “${containedAlias}”, ma aggiunge un focus o una specializzazione.`
        : 'Titolo, parole chiave e classe di laurea sono molto vicini al corso desiderato.',
      classHit,
      similarity
    };
  }

  if (classHit) {
    const score = Math.round(clamp(75 + similarity * 16, 75, 89));
    return {
      score,
      tier: 'class',
      label: MATCH_TIER_LABELS.class,
      reason: `La classe ${course.classCode || 'del corso'} è compatibile, ma il titolo indica un focus diverso.`,
      classHit,
      similarity
    };
  }

  const score = Math.round(clamp(60 + similarity * 16, 60, 74));
  return {
    score,
    tier: 'macro',
    label: MATCH_TIER_LABELS.macro,
    reason: `Il corso è nella stessa macroarea ${target.group}, ma classe e focus non coincidono.`,
    classHit,
    similarity
  };
}

interface Coordinate {
  coords: [number, number];
  precision: 'city' | 'region';
}

function coordinateFor(value: string, region = ''): Coordinate | null {
  const normalized = normalize(value);
  const entries = Object.entries(finderData.cityCoordinates || {});
  const direct = finderData.cityCoordinates?.[normalized];
  if (direct) return { coords: direct, precision: 'city' };
  const partial = entries.find(
    ([key]) => normalized.length >= 4 && (key.includes(normalized) || normalized.includes(key))
  );
  if (partial) return { coords: partial[1], precision: 'city' };
  const regionCoords = finderData.regionCenters?.[region];
  return regionCoords ? { coords: regionCoords, precision: 'region' } : null;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function estimateCommute(
  residence: Coordinate | null,
  destination: Coordinate | null,
  residenceRegion: string,
  destinationRegion: string
): CommuteEstimate {
  if (!residence || !destination) return { minutes: null, precision: 'unknown' };
  const islands = new Set(['Sardegna', 'Sicilia']);
  if (residenceRegion !== destinationRegion && (islands.has(residenceRegion) || islands.has(destinationRegion))) {
    return { minutes: Infinity, precision: 'city' };
  }
  const distance = haversineKm(residence.coords, destination.coords);
  const precision = residence.precision === 'city' && destination.precision === 'city' ? 'city' : 'region';
  if (distance < 8) return { minutes: 20, precision };
  const railDistance = distance * 1.18;
  const borderPenalty = residenceRegion === destinationRegion ? 0 : 12;
  const minutes = Math.round((15 + borderPenalty + (railDistance / 72) * 60) / 5) * 5;
  return { minutes, precision };
}

export function geographyFit(university: University, course: Course, answers: FinderAnswers): GeographyFit {
  if (isDistanceCourse(course)) {
    return {
      allowed: true,
      score: 90,
      label: 'Corso a distanza: nessun trasferimento necessario',
      commute: null,
      online: true,
      sameCity: false,
      mode: 'online'
    };
  }

  const residence = coordinateFor(answers.residenceCity, answers.residenceRegion);
  const destination = coordinateFor(course.city || university.city, university.region);
  const commute = estimateCommute(residence, destination, answers.residenceRegion, university.region);
  const sameCity = normalize(answers.residenceCity) === normalize(course.city || university.city);
  const commuteLimit = Number(finderData.methodology?.regionalCommuteLimitMinutes) || 90;
  const canCommute =
    answers.commute === 'yes' && commute.minutes != null && Number.isFinite(commute.minutes) && commute.minutes <= commuteLimit;

  if (sameCity) {
    return { allowed: true, score: 100, label: 'Sede nella tua città', commute, online: false, sameCity: true, mode: 'home' };
  }
  if (canCommute) {
    return {
      allowed: true,
      score: 90,
      label: `Pendolarismo compatibile: circa ${commute.minutes} minuti stimati con regionali o regionali veloci`,
      commute,
      online: false,
      sameCity: false,
      mode: 'commute'
    };
  }

  const relocation = (label: string): GeographyFit => ({
    allowed: true,
    score: 90,
    label,
    commute,
    online: false,
    sameCity: false,
    mode: 'relocation'
  });
  const neighbors = finderData.regionNeighbors?.[answers.residenceRegion] || [];
  if (answers.relocation === 'region' && university.region === answers.residenceRegion) {
    return relocation('Trasferimento compatibile nella tua regione');
  }
  if (answers.relocation === 'neighbors' && university.region === answers.residenceRegion) {
    return relocation('Trasferimento compatibile nella tua regione');
  }
  if (answers.relocation === 'neighbors' && neighbors.includes(university.region)) {
    return relocation('Trasferimento compatibile in una regione confinante');
  }
  if (answers.relocation === 'italy') {
    return relocation(
      university.region === answers.residenceRegion
        ? 'Trasferimento compatibile nella tua regione'
        : 'Trasferimento compatibile con la disponibilità nazionale'
    );
  }

  return {
    allowed: false,
    score: 0,
    label: 'Fuori dall’area geografica indicata',
    commute,
    online: false,
    sameCity: false,
    mode: 'excluded'
  };
}

function resultWeights(geography: GeographyFit): Record<WeightKey, number> {
  if (geography?.sameCity) {
    return { course: 0.3, geography: 0.2, ranking: 0.23, cost: 0.18, language: 0.04, support: 0.05 };
  }
  return { course: 0.3, geography: 0.18, ranking: 0.25, cost: 0.18, language: 0.04, support: 0.05 };
}

function costForCity(city: string, macroArea: string): CostResult['cityCost'] {
  const normalized = normalize(city);
  const match = Object.entries(finderData.cityCosts || {}).find(([key]) => {
    const clean = normalize(key);
    return clean === normalized || (normalized.length >= 5 && (clean.includes(normalized) || normalized.includes(clean)));
  });
  const raw = match?.[1] || finderData.macroDefaultCost?.[macroArea] || [900, 400, 'medio'];
  return { monthly: Number(raw[0]) || 900, rent: Number(raw[1]) || 400, tier: raw[2] || 'medio', estimated: true };
}

function tuitionFor(university: University): number {
  const metrics = getMetrics(university.id);
  const value = Number(metrics.tuitionAllStudents || metrics.tuitionPayers || 0);
  if (value > 0) return value;
  if (university.category === 'Telematica') return 2500;
  return university.isPublic ? 1600 : 6500;
}

function supportRawMetrics(university: University) {
  const metrics = getMetrics(university.id);
  const students = Math.max(1, Number(metrics.students || 0));
  const scholarships = Math.max(0, Number(metrics.scholarshipsUniversityMur || 0));
  const full = Math.max(0, Number(metrics.fullExemptions || 0));
  const partial = Math.max(0, Number(metrics.partialExemptions || 0));
  const housingAssigned = Math.max(0, Number(metrics.housingAssigned || 0));
  const housingContributions = Math.max(0, Number(metrics.housingContributions || 0));
  const housingPlaces =
    Math.max(0, Number(metrics.residencePlacesDirect || 0)) + Math.max(0, Number(metrics.residencePlacesPartner || 0));
  const canteenPlaces = Math.max(0, Number(metrics.canteenPlaces || 0));
  const beneficiaryProxy = Math.min(students, scholarships + full + partial + housingAssigned + housingContributions);
  return {
    students,
    scholarships,
    full,
    partial,
    housingAssigned,
    housingContributions,
    housingPlaces,
    canteenPlaces,
    beneficiaryRate: (beneficiaryProxy / students) * 100,
    scholarshipRate: (scholarships / students) * 1000,
    exemptionRate: ((full + partial * 0.35) / students) * 1000,
    housingRate: ((housingAssigned + housingContributions + housingPlaces * 0.35) / students) * 1000,
    qualityProxy: ((scholarships * 1.15 + full * 1.35 + housingAssigned * 0.45 + housingContributions * 0.35) / students) * 1000,
    meritProxy: ((scholarships * 0.75 + full * 0.35) / students) * 1000
  };
}

type BenchmarkKey = 'beneficiaryRate' | 'scholarshipRate' | 'exemptionRate' | 'housingRate' | 'qualityProxy' | 'meritProxy';
let supportBenchmarkCache: Record<BenchmarkKey, number[]> | null = null;

function supportBenchmarks(): Record<BenchmarkKey, number[]> {
  if (supportBenchmarkCache) return supportBenchmarkCache;
  const rows = sortedUniversities().map(supportRawMetrics);
  const keys: BenchmarkKey[] = ['beneficiaryRate', 'scholarshipRate', 'exemptionRate', 'housingRate', 'qualityProxy', 'meritProxy'];
  supportBenchmarkCache = Object.fromEntries(
    keys.map((key) => [key, rows.map((row) => Number(row[key]) || 0).sort((a, b) => a - b)])
  ) as Record<BenchmarkKey, number[]>;
  return supportBenchmarkCache;
}

function comparativeScore(value: number, values: number[], options: { floor?: number; ceiling?: number } = {}): number {
  const floor = options.floor ?? 16;
  const ceiling = options.ceiling ?? 92;
  const number = Number(value) || 0;
  if (number <= 0 || !values.length) return floor;
  const lowerOrEqual = values.filter((entry) => entry <= number).length;
  const percentile = lowerOrEqual / values.length;
  return clamp(floor + percentile * (ceiling - floor), floor, ceiling);
}

export function supportScore(university: University, answers: Pick<FinderAnswers, 'iseeRange'>): SupportResult {
  const raw = supportRawMetrics(university);
  const benchmarks = supportBenchmarks();
  const beneficiary = comparativeScore(raw.beneficiaryRate, benchmarks.beneficiaryRate, { floor: 18, ceiling: 92 });
  const quality = comparativeScore(raw.qualityProxy, benchmarks.qualityProxy, { floor: 16, ceiling: 90 });
  const housing = comparativeScore(raw.housingRate, benchmarks.housingRate, { floor: 12, ceiling: 90 });
  const exemptions = comparativeScore(raw.exemptionRate, benchmarks.exemptionRate, { floor: 14, ceiling: 91 });
  const regional = REGIONAL_SUPPORT_AGENCIES[university.region] ? 72 : 48;
  const selectedRange = getIseeRange(answers.iseeRange);
  const lowIsee =
    selectedRange?.min != null && selectedRange.min <= Number(serviceData.nationalThresholds?.isee || 28339.88);
  const isee = lowIsee
    ? clamp(exemptions * 0.58 + beneficiary * 0.28 + regional * 0.14, 15, 91)
    : clamp(quality * 0.4 + beneficiary * 0.2 + 42, 15, 86);
  const meritBase = comparativeScore(raw.meritProxy, benchmarks.meritProxy, { floor: 15, ceiling: 88 });
  const highIsee = selectedRange?.min != null && selectedRange.min > 30000;
  const merit = highIsee ? clamp(meritBase + 4, 15, 90) : meritBase;
  const score = clamp(
    beneficiary * 0.3 +
      quality * 0.2 +
      housing * 0.15 +
      exemptions * 0.15 +
      regional * 0.1 +
      isee * 0.05 +
      merit * 0.05,
    12,
    93
  );

  return {
    score,
    agency: REGIONAL_SUPPORT_AGENCIES[university.region] || 'Ente territoriale da verificare',
    raw,
    breakdown: { beneficiary, quality, housing, exemptions, regional, isee, merit },
    note: 'Indice comparativo su dati aggregati: non misura l’idoneità personale e alcune categorie possono sovrapporsi.'
  };
}

function iseeBudget(value: string): number {
  const range = getIseeRange(value);
  if (!range || range.min == null) return 18000;
  if (range.max == null || !Number.isFinite(range.max)) return 60000;
  const midpoint = (Number(range.min) + Number(range.max)) / 2;
  // L’ISEE non è un budget di spesa: questa trasformazione serve soltanto a
  // graduare il peso di rette e città, mantenendo separata la stima economica.
  return clamp(6500 + midpoint * 0.72, 10000, 52000);
}

function affordability(university: University, course: Course, answers: FinderAnswers, support: SupportResult): CostResult {
  const tuition = tuitionFor(university);
  const cityCost = costForCity(course.city || university.city, university.macroArea);
  const online = isDistanceCourse(course);
  const livingAnnual = online ? 1200 : cityCost.monthly * 10;
  const annual = tuition + livingAnnual;
  const budget = iseeBudget(answers.iseeRange);
  const ratio = annual / Math.max(1, budget);
  const base = 100 - Math.max(0, ratio - 0.45) * 42 - Math.max(0, ratio - 1) * 28;
  const selectedRange = getIseeRange(answers.iseeRange);
  const lowIsee = selectedRange?.max != null && selectedRange.max <= 22000;
  const aidOffset = lowIsee ? support.score * 0.065 : support.score * 0.025;
  return {
    score: clamp(base + aidOffset, 12, 100),
    tuition,
    cityCost,
    annual,
    budget,
    ratio,
    online,
    needsAid: lowIsee && (annual > budget * 0.88 || cityCost.tier === 'molto alto' || tuition > 4500),
    support: support.score
  };
}

function languageFit(course: Course, preference: string): LanguageFit {
  const inferred = inferCourseLanguage(course);
  if (preference === 'either') {
    return {
      score: 100,
      inferred,
      label: inferred === 'english' ? 'Titolo del corso in inglese' : 'Titolo del corso in italiano'
    };
  }
  const match = inferred === preference;
  return {
    score: match ? 100 : 48,
    inferred,
    label: match
      ? `Lingua coerente con la preferenza: ${preference === 'english' ? 'inglese' : 'italiano'}`
      : 'Lingua da verificare nella pagina ufficiale del corso'
  };
}

export function rankCandidates(
  target: FinderTarget,
  answers: FinderAnswers,
  options: { includeDistance?: boolean; includeTelematic?: boolean } = {}
): FinderResult[] {
  const includeDistance = Boolean(options.includeDistance);
  const includeTelematic = Boolean(options.includeTelematic);
  const candidates: FinderResult[] = [];

  sortedUniversities().forEach((university) => {
    const relevant = sortedCourses(university.id)
      .filter((course) => degreeMatches(course, answers.degree))
      .filter(
        (course) =>
          includeDistance || !isDistanceCourse(course) || (includeTelematic && university.category === 'Telematica')
      )
      .map((course) => ({ course, match: courseMatch(course, target) }))
      .filter((entry) => entry.match.score >= 60);

    if (!relevant.length) return;
    const support = supportScore(university, answers);
    const ranking = forTarget(university, target, answers.degree);

    const evaluated = relevant
      .map((entry): FinderResult | null => {
        const geography = geographyFit(university, entry.course, answers);
        if (!geography.allowed) return null;
        const cost = affordability(university, entry.course, answers, support);
        const language = languageFit(entry.course, answers.language);
        const weights = resultWeights(geography);
        const contributions = {
          course: entry.match.score * weights.course,
          geography: geography.score * weights.geography,
          ranking: ranking.score * weights.ranking,
          cost: cost.score * weights.cost,
          language: language.score * weights.language,
          support: support.score * weights.support
        };
        const totalRaw = Object.values(contributions).reduce((sum, value) => sum + value, 0);

        return {
          university,
          course: entry.course,
          courseMatch: entry.match,
          geography,
          cost,
          ranking,
          language,
          support,
          weights,
          contributions,
          totalRaw,
          total: Math.round(totalRaw),
          target
        };
      })
      .filter((item): item is FinderResult => Boolean(item))
      .sort(
        (a, b) =>
          b.totalRaw - a.totalRaw ||
          b.courseMatch.score - a.courseMatch.score ||
          Number(b.geography.sameCity) - Number(a.geography.sameCity) ||
          Number(b.course.enrolled || 0) - Number(a.course.enrolled || 0) ||
          String(a.course.name || '').localeCompare(String(b.course.name || ''), 'it')
      );

    if (evaluated.length) candidates.push(evaluated[0]);
  });

  return candidates.sort(
    (a, b) =>
      b.totalRaw - a.totalRaw ||
      b.courseMatch.score - a.courseMatch.score ||
      a.university.name.localeCompare(b.university.name, 'it')
  );
}
