// Porting di legacy/js/official-rankings.js: gerarchia QS by Subject → CENSIS didattica → CENSIS generale.
import { CENSIS_RANKINGS as censis, QS_SUBJECT_RANKINGS as qs } from '../data';
import type { CourseProfile, QsRecord, SubjectSelection, University } from '../types';
import { matchCourse, type MatchableCourse } from './course-catalog';

export type RankingSource = 'qs-subject' | 'qs-general' | 'censis-teaching' | 'censis-general' | 'unavailable';

export interface RankingDetail {
  label: string;
  url?: string;
  subject?: string;
  rank?: string;
  rankValue?: number | null;
  score?: number | null;
  weight?: number;
  position?: number;
  rawScore?: number;
  level?: string;
  services?: number;
  scholarships?: number;
  structures?: number;
  digital?: number;
  international?: number;
  employability?: number;
}

export interface RankingResult {
  source: RankingSource;
  sourceFamily: string;
  tier: number;
  official: boolean;
  subjectSpecific: boolean;
  score: number;
  year: number | string;
  label: string;
  summary: string;
  note: string;
  details: RankingDetail[];
  url: string;
}

/** Destinazione del finder: un corso generale o una macroarea. */
export interface RankingTarget {
  type?: 'course' | 'group';
  label?: string;
  group?: string;
  profile?: CourseProfile | null;
  slug?: string;
}

function clamp(value: unknown, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function rankMidpoint(record: QsRecord | null | undefined): number | null {
  if (Number(record?.rank) > 0) return Number(record!.rank);
  if (Array.isArray(record?.band) && record!.band.length === 2) {
    return (Number(record!.band[0]) + Number(record!.band[1])) / 2;
  }
  return null;
}

export function rankLabel(record: QsRecord | null | undefined): string {
  if (Number(record?.rank) > 0) return `#${Number(record!.rank)}`;
  if (Array.isArray(record?.band) && record!.band.length === 2) return `${record!.band[0]}–${record!.band[1]}`;
  return 'n.d.';
}

// Il pavimento a 66 rende esplicita la gerarchia richiesta dal progetto:
// una presenza nel QS by Subject precede sempre un fallback CENSIS.
export function qsRankToScore(record: QsRecord | null | undefined): number | null {
  if (Number(record?.score) > 0) return clamp(66 + Number(record!.score) * 0.33, 66, 99);
  const rank = rankMidpoint(record);
  if (rank == null || !Number.isFinite(rank)) return null;
  if (rank <= 10) return 99 - (rank - 1) * 0.35;
  if (rank <= 50) return 95.85 - (rank - 10) * 0.15;
  if (rank <= 100) return 89.85 - (rank - 50) * 0.1;
  if (rank <= 200) return 84.85 - (rank - 100) * 0.065;
  if (rank <= 500) return 78.35 - (rank - 200) * 0.035;
  return clamp(67.85 - (rank - 500) * 0.006, 66, 99);
}

function generalQsScore(university: University): number | null {
  const rank = Number(university?.qsRankValue);
  if (!Number.isFinite(rank) || rank <= 0) return null;
  return qsRankToScore({ rank });
}

export function levelKey(value: unknown): string {
  const level = String(value || '').toLowerCase();
  if (level === 'triennale' || level === 'bachelor') return 'bachelor';
  if (level === 'ciclo-unico' || level === 'single') return 'single';
  if (level === 'magistrale' || level === 'master') return 'master';
  return '';
}

function subjectSelections(
  courseOrTarget: { slug?: string; profile?: { slug?: string } | null } | null | undefined,
  group: string
): SubjectSelection[] {
  const slug = courseOrTarget?.slug || courseOrTarget?.profile?.slug || '';
  if (slug && Array.isArray(qs.courseSubjects?.[slug])) return qs.courseSubjects[slug];
  return qs.groupSubjects?.[group] || [];
}

function qsSubject(university: University, selections: SubjectSelection[]): RankingResult | null {
  const details = (selections || [])
    .map((selection) => {
      const record = qs.rankings?.[selection.subject]?.[university.id];
      const score = qsRankToScore(record);
      if (!record || score == null) return null;
      const meta = qs.subjects?.[selection.subject] || { label: selection.subject, url: '' };
      return {
        subject: selection.subject,
        label: meta.label,
        url: meta.url,
        rank: rankLabel(record),
        rankValue: rankMidpoint(record),
        score,
        weight: Number(selection.weight) || 1
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!details.length) return null;
  const weightTotal = details.reduce((sum, item) => sum + item.weight, 0) || 1;
  const score = details.reduce((sum, item) => sum + item.score * item.weight, 0) / weightTotal;
  return {
    source: 'qs-subject',
    sourceFamily: 'QS',
    tier: 3,
    official: true,
    subjectSpecific: true,
    score: clamp(score, 66, 99),
    year: qs.year || 2026,
    label: `QS by Subject ${qs.year || 2026}`,
    summary: details.map((item) => `${item.label} ${item.rank}`).join(' · '),
    note: 'Graduatoria internazionale per materia. Se sono pertinenti più materie, il punteggio del sito usa una media pesata dei dati disponibili.',
    details,
    url: details[0]?.url || ''
  };
}

function censisTeaching(university: University, group: string, level: unknown): RankingResult | null {
  const requestedLevel = levelKey(level);
  const levels = requestedLevel ? [requestedLevel] : ['bachelor', 'single', 'master'];
  const matches: RankingResult[] = [];

  levels.forEach((key) => {
    const table = censis.teaching?.[key]?.[group];
    const record = table?.records?.[university.id];
    if (!table || !record) return;
    const raw = Number(record.score) || 0;
    const score = clamp(44 + ((raw - 60) / 50) * 20, 44, 64);
    matches.push({
      source: 'censis-teaching',
      sourceFamily: 'CENSIS',
      tier: 2,
      official: true,
      subjectSpecific: true,
      score,
      year: censis.edition || '2026/2027',
      label: `CENSIS didattica ${censis.edition || '2026/2027'}`,
      summary: `#${record.position} nel raggruppamento ${group}`,
      note: `Classifica CENSIS della didattica ${key === 'bachelor' ? 'triennale' : key === 'single' ? 'a ciclo unico' : 'magistrale'}, costruita su progressione di carriera e rapporti internazionali. Non è direttamente confrontabile con QS.`,
      details: [
        {
          label: group,
          position: record.position,
          rawScore: raw,
          level: key,
          url: table.source || censis.source || ''
        }
      ],
      url: table.source || censis.source || ''
    });
  });

  if (!matches.length) return null;
  return matches.sort((a, b) => b.score - a.score)[0];
}

export function censisGeneral(university: University): RankingResult | null {
  const record = censis.general?.[university.id];
  if (!record) return null;
  const raw = Number(record.score) || 0;
  return {
    source: 'censis-general',
    sourceFamily: 'CENSIS',
    tier: 1,
    official: true,
    subjectSpecific: false,
    score: clamp(38 + ((raw - 70) / 30) * 14, 38, 52),
    year: censis.edition || '2026/2027',
    label: `CENSIS atenei ${censis.edition || '2026/2027'}`,
    summary: `#${record.position} nella categoria “${record.group}”`,
    note: 'La posizione CENSIS è relativa a un gruppo omogeneo per dimensione e tipologia: non costituisce una graduatoria unica di tutti gli atenei italiani.',
    details: [
      {
        label: record.group,
        position: record.position,
        rawScore: raw,
        services: record.services,
        scholarships: record.scholarships,
        structures: record.structures,
        digital: record.digital,
        international: record.international,
        employability: record.employability,
        url: censis.generalSource || censis.source || ''
      }
    ],
    url: censis.generalSource || censis.source || ''
  };
}

function qsGeneral(university: University): RankingResult | null {
  const score = generalQsScore(university);
  if (score == null) return null;
  return {
    source: 'qs-general',
    sourceFamily: 'QS',
    tier: 3,
    official: true,
    subjectSpecific: false,
    score,
    year: 2027,
    label: 'QS World University Rankings 2027',
    summary: `#${university.qsRank}`,
    note: 'Posizione internazionale complessiva dell’ateneo; per confrontare corsi viene preferito il QS per materia.',
    details: [{ label: 'Ranking generale', rank: `#${university.qsRank}`, score: university.qsScore }],
    url: 'https://www.topuniversities.com/world-university-rankings'
  };
}

function noRanking(group = ''): RankingResult {
  return {
    source: 'unavailable',
    sourceFamily: '',
    tier: 0,
    official: false,
    subjectSpecific: false,
    score: 28,
    year: '',
    label: 'Ranking ufficiale non disponibile',
    summary: group ? `Nessun QS/CENSIS collegato per ${group}` : 'Nessun QS/CENSIS collegato',
    note: 'Il sito non usa più indici interni come sostituto di una classifica ufficiale.',
    details: [],
    url: ''
  };
}

export function forGroup(university: University, group: string, level = ''): RankingResult {
  const subject = qsSubject(university, subjectSelections(null, group));
  if (subject) return subject;
  return censisTeaching(university, group, level) || censisGeneral(university) || noRanking(group);
}

export function forCourse(
  university: University,
  course: (MatchableCourse & { level?: string }) | null,
  explicitProfile: CourseProfile | null = null
): RankingResult {
  const profile = explicitProfile || matchCourse(course) || null;
  const group = course?.group || profile?.group || '';
  const subject = qsSubject(university, subjectSelections(profile, group));
  if (subject) return subject;
  return censisTeaching(university, group, course?.level) || censisGeneral(university) || noRanking(group);
}

export function forTarget(university: University, target: RankingTarget | null, degree = ''): RankingResult {
  const group = target?.group || target?.profile?.group || '';
  const subject = qsSubject(university, subjectSelections(target?.profile || target, group));
  if (subject) return subject;
  return censisTeaching(university, group, degree) || censisGeneral(university) || noRanking(group);
}

export function general(university: University): RankingResult {
  return qsGeneral(university) || censisGeneral(university) || noRanking('');
}

export function shortLabel(result: RankingResult | null | undefined): string {
  if (!result) return 'n.d.';
  if (
    result.source === 'qs-subject' ||
    result.source === 'qs-general' ||
    result.source === 'censis-teaching' ||
    result.source === 'censis-general'
  ) {
    return `${result.label}: ${result.summary}`;
  }
  return result.summary || result.label;
}
