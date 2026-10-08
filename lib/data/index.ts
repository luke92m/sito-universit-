// Accesso tipizzato ai dataset statici. Da importare SOLO in codice server:
// il dataset corsi pesa ~1,25 MB e non deve finire nel bundle client.
import 'server-only';

import universitiesJson from './universities.json';
import datasetJson from './university-dataset.json';
import finderJson from './university-finder.json';
import qsJson from './qs-subject-rankings.json';
import censisJson from './censis-rankings.json';
import cityJson from './city-indicators.json';
import type { Course, GroupStats, QsRecord, SubjectSelection, University, UniversityMetrics } from '../types';

type CourseRow = [string, string, string, string, string, string, string, string, number, string];

interface UniversityDataset {
  version: number;
  academicYear: string;
  structureDate: string;
  groups: string[];
  courseColumns: string[];
  universities: Record<
    string,
    { courses: CourseRow[]; groups: Record<string, GroupStats>; metrics: UniversityMetrics }
  >;
  sources: Record<string, string>;
}

export const UNIVERSITIES = universitiesJson as University[];
export const DATASET = datasetJson as unknown as UniversityDataset;

export { COURSE_CATALOG } from './course-catalog';
export { STUDENT_SERVICES } from './student-services';

export const FINDER_DATA = finderJson as unknown as {
  version: number;
  referenceDate: string;
  regionNeighbors: Record<string, string[]>;
  regionCenters: Record<string, [number, number]>;
  cityCoordinates: Record<string, [number, number]>;
  cityCosts: Record<string, [number, number, string]>;
  macroDefaultCost: Record<string, [number, number, string]>;
  methodology: { regionalCommuteLimitMinutes?: number } & Record<string, unknown>;
};

export const QS_SUBJECT_RANKINGS = qsJson as unknown as {
  version: number;
  year: number;
  publishedAt: string;
  subjects: Record<string, { label: string; url: string }>;
  courseSubjects: Record<string, SubjectSelection[]>;
  groupSubjects: Record<string, SubjectSelection[]>;
  rankings: Record<string, Record<string, QsRecord>>;
  methodology: Record<string, unknown>;
};

export interface CensisGeneralRecord {
  group: string;
  position: number;
  score: number;
  kind: string;
  services?: number;
  scholarships?: number;
  structures?: number;
  digital?: number;
  international?: number;
  employability?: number;
}

export interface CensisTeachingTable {
  source?: string;
  records: Record<string, { position: number; score: number }>;
}

export const CENSIS_RANKINGS = censisJson as unknown as {
  edition: string;
  published: string;
  source: string;
  generalSource: string;
  methodology: unknown;
  general: Record<string, CensisGeneralRecord>;
  teaching: Record<string, Record<string, CensisTeachingTable>>;
};

export const CITY_INDICATORS = cityJson as unknown as {
  version: number;
  roomRents: Record<string, number>;
  macroSpending: Record<string, number>;
  youthQuality: Record<string, [number, number]>;
  sources: Record<string, string>;
};

// --- Accesso ai corsi (porting di legacy/js/university-courses.js) ---

const courseCache = new Map<string, Course[]>();

function decodeCourse(universityId: string, row: CourseRow, index: number): Course {
  return {
    id: `${universityId}:${index}`,
    universityId,
    name: row[0],
    classCode: row[1],
    className: row[2],
    group: row[3],
    area: row[4],
    access: row[5],
    delivery: row[6],
    city: row[7],
    enrolled: Number(row[8]) || 0,
    level: row[9] || 'altro'
  };
}

export function getUniversityData(universityId: string) {
  return DATASET.universities[universityId] || { courses: [], groups: {}, metrics: {} };
}

export function getCourses(universityId: string): Course[] {
  const cached = courseCache.get(universityId);
  if (cached) return cached;
  const courses = (getUniversityData(universityId).courses || []).map((row, index) =>
    decodeCourse(universityId, row, index)
  );
  courseCache.set(universityId, courses);
  return courses;
}

export function getCourse(universityId: string, courseId: string): Course | null {
  return getCourses(universityId).find((course) => course.id === courseId) || null;
}

export function getMetrics(universityId: string): UniversityMetrics {
  return getUniversityData(universityId).metrics || {};
}

export function getGroupStats(universityId: string, group: string): GroupStats | null {
  return getUniversityData(universityId).groups?.[group] || null;
}

export function getDepartmentNames(): string[] {
  return Array.isArray(DATASET.groups) ? DATASET.groups.slice() : [];
}

const UNIVERSITY_BY_ID = new Map(UNIVERSITIES.map((university) => [university.id, university]));

export function getUniversityById(id: string): University | null {
  return UNIVERSITY_BY_ID.get(id) || null;
}
