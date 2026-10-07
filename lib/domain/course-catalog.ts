// Porting di legacy/js/course-catalog.js (logica pura, utilizzabile anche nel client).
import { COURSE_CATALOG } from '../data/course-catalog';
import type { CourseProfile, ScoreVector, Weights } from '../types';
import { normalize } from './text';

export const DIMENSIONS = COURSE_CATALOG.dimensions;
export const QUESTIONS = COURSE_CATALOG.questions;
export const COURSES = COURSE_CATALOG.courses;

const GROUP_FALLBACKS: Record<string, string> = {
  Economico: 'economia-aziendale',
  Giuridico: 'giurisprudenza',
  'Politico-Sociale e Comunicazione': 'scienze-politiche',
  Psicologico: 'psicologia',
  'Educazione e Formazione': 'scienze-educazione',
  'Letterario-Umanistico': 'lettere-beni-culturali',
  Linguistico: 'lingue-mediazione',
  'Informatica e Tecnologie ICT': 'informatica',
  "Ingegneria industriale e dell'informazione": 'ingegneria-meccanica',
  'Architettura e Ingegneria civile': 'ingegneria-civile-architettura',
  Scientifico: 'scienze-naturali-ambientali',
  'Medico-Sanitario e Farmaceutico': 'professioni-sanitarie',
  'Agrario-Forestale e Veterinario': 'agraria-alimentare',
  'Arte e Design': 'design',
  'Scienze motorie e sportive': 'scienze-motorie'
};

export type QuizAnswers = Record<string, string | string[] | undefined>;

export interface RankedCourse extends CourseProfile {
  score: number;
}

/** Corso reale minimale per l'abbinamento a un profilo generale. */
export interface MatchableCourse {
  name?: string;
  classCode?: string;
  group?: string;
}

function emptyVector(): ScoreVector {
  return Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, 0]));
}

function addWeights(vector: ScoreVector, weights: Weights, multiplier = 1): ScoreVector {
  Object.entries(weights || {}).forEach(([dimension, value]) => {
    if (Object.prototype.hasOwnProperty.call(vector, dimension)) {
      vector[dimension] += Number(value || 0) * multiplier;
    }
  });
  return vector;
}

export function vectorFromAnswers(answers: QuizAnswers): ScoreVector {
  const vector = emptyVector();
  QUESTIONS.forEach((question) => {
    const raw = answers?.[question.id];
    const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
    values.forEach((value) => {
      const option = question.options.find((candidate) => candidate.value === value);
      if (option) addWeights(vector, option.weights);
    });
  });
  return vector;
}

function profileVector(profile: CourseProfile): ScoreVector {
  return Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, Number(profile.weights?.[dimension] || 0)]));
}

export function similarity(vector: ScoreVector, profile: CourseProfile): number {
  const target = profileVector(profile);
  let dot = 0;
  let lengthA = 0;
  let lengthB = 0;
  DIMENSIONS.forEach((dimension) => {
    const a = Number(vector?.[dimension] || 0);
    const b = Number(target[dimension] || 0);
    dot += a * b;
    lengthA += a * a;
    lengthB += b * b;
  });
  if (!lengthA || !lengthB) return 0;
  const cosine = dot / (Math.sqrt(lengthA) * Math.sqrt(lengthB));
  return Math.max(0, Math.min(100, Math.round(42 + cosine * 56)));
}

export function rankCourses(vector: ScoreVector): RankedCourse[] {
  return COURSES.map((course) => ({ ...course, score: similarity(vector, course) })).sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name, 'it')
  );
}

function keywordScore(course: MatchableCourse, profile: CourseProfile): number {
  const name = normalize(course?.name);
  const classCode = String(course?.classCode || '').toUpperCase();
  let score = profile.group === course?.group ? 2 : 0;

  (profile.keywords || []).forEach((keyword) => {
    const clean = normalize(keyword);
    if (clean && name.includes(clean)) score += 6 + Math.min(5, clean.split(' ').length);
  });

  (profile.classCodes || []).forEach((code) => {
    const upper = String(code).toUpperCase();
    if (classCode === upper) score += 5;
    else if (upper && classCode.startsWith(upper)) score += 3;
  });

  return score;
}

export function matchCourse(course: MatchableCourse | null | undefined): CourseProfile | null {
  if (!course) return null;
  const ranked = COURSES.map((profile) => ({ profile, score: keywordScore(course, profile) })).sort(
    (a, b) => b.score - a.score
  );
  if (ranked[0]?.score > 2) return ranked[0].profile;
  const fallback = GROUP_FALLBACKS[course.group || ''];
  return COURSES.find((profile) => profile.slug === fallback) || COURSES[0];
}

export function getCourseProfile(slug: string | null | undefined): CourseProfile | null {
  return COURSES.find((course) => course.slug === slug) || null;
}

export function scoreActualCourse(course: MatchableCourse, vector: ScoreVector | null | undefined): number | null {
  const profile = matchCourse(course);
  if (!profile || !vector) return null;
  return similarity(vector, profile);
}

export function generalCoursesSorted(): CourseProfile[] {
  return COURSES.slice().sort((a, b) => a.name.localeCompare(b.name, 'it'));
}
