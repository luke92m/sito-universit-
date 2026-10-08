// Dati per la pagina Atenei (porting della parte non visuale di legacy/js/atenei.js).
// Calcolati sul server e inviati al client in forma compatta.
import { DATASET, UNIVERSITIES, getCourses, getGroupStats, getMetrics, getUniversityById } from '../data';
import type { University } from '../types';
import { forGroup, general, type RankingResult } from './official-rankings';
import { profile, type UniversityProfile } from './university-profiles';

export type InstitutionType = 'public' | 'private' | 'online' | 'institute';

export interface RankingSummary {
  source: RankingResult['source'];
  tier: number;
  score: number;
  label: string;
  summary: string;
  note: string;
  year: number | string;
}

export interface CatalogEntry {
  id: string;
  name: string;
  shortName: string;
  city: string;
  province: string;
  region: string;
  category: string;
  institutionType: InstitutionType;
  groups: string[];
  ranking: RankingSummary;
}

export interface DepartmentEntry {
  ranking: RankingSummary;
  courseCount: number;
  enrolled: number;
}

export interface UniversityCard {
  university: University;
  profile: UniversityProfile;
  ranking: RankingSummary;
  students: number | null;
  courseCount: number;
  groupCount: number;
}

function normalizeCategory(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function institutionType(university: University): InstitutionType {
  const category = normalizeCategory(university.category);
  if (category.includes('telematica')) return 'online';
  if (category.includes('scuola superiore')) return 'institute';
  if (university.isPublic) return 'public';
  return 'private';
}

function summarize(ranking: RankingResult): RankingSummary {
  const { source, tier, score, label, summary, note, year } = ranking;
  return { source, tier, score, label, summary, note, year };
}

export function catalogEntries(): CatalogEntry[] {
  return UNIVERSITIES.map((university) => ({
    id: university.id,
    name: university.name,
    shortName: university.shortName,
    city: university.city,
    province: university.province,
    region: university.region,
    category: university.category,
    institutionType: institutionType(university),
    groups: DATASET.groups.filter((group) => Boolean(getGroupStats(university.id, group))),
    ranking: summarize(general(university))
  }));
}

export function departmentGroups(): string[] {
  return DATASET.groups.slice();
}

/** Ranking per area disciplinare di ogni ateneo che offre corsi nell'area. */
export function departmentRankings(group: string): Record<string, DepartmentEntry> {
  if (!DATASET.groups.includes(group)) return {};
  const result: Record<string, DepartmentEntry> = {};
  UNIVERSITIES.forEach((university) => {
    const stats = getGroupStats(university.id, group);
    if (!stats) return;
    result[university.id] = {
      ranking: summarize(forGroup(university, group)),
      courseCount: Number(stats.courseCount) || 0,
      enrolled: Number(stats.enrolled) || 0
    };
  });
  return result;
}

export function universityCard(universityId: string): UniversityCard | null {
  const university = getUniversityById(universityId);
  if (!university) return null;
  const courses = getCourses(university.id);
  const metrics = getMetrics(university.id);
  return {
    university,
    profile: profile(university),
    ranking: summarize(general(university)),
    students: metrics.students ? Number(metrics.students) : null,
    courseCount: courses.length,
    groupCount: new Set(courses.map((course) => course.group).filter(Boolean)).size
  };
}
