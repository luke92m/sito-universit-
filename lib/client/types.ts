// Tipi dei dati utente lato client (righe Supabase e strutture equivalenti locali).
import type { ScoreVector } from '../types';

export type Situation = 'university' | 'enrolling' | 'curious';

/** Preferenze riusate tra gli strumenti di orientamento (ex guidanceProfile della v8). */
export interface GuidanceProfile {
  residenceRegion?: string;
  residenceCity?: string;
  iseeRange?: string;
  preferredDegree?: string;
  commutePreference?: string;
  relocationScope?: string;
  languagePreference?: string;
  lastCourseChoice?: string;
  lastUniversityFinderAt?: string;
  lastScholarshipCheckAt?: string;
  updatedAt?: string;
}

export interface ProfileRow {
  id: string;
  display_name: string;
  situation: Situation;
  journey_phase: 'enrolled' | 'pre-enrolling' | null;
  university_id: string | null;
  course_name: string | null;
  study_year: number | null;
  guidance: GuidanceProfile;
  role: string;
}

export interface SiteUser {
  id: string;
  email: string;
  profile: ProfileRow;
}

export interface Journey {
  phase: 'enrolled' | 'pre-enrolling';
  universityId: string;
  courseName: string | null;
  year: number | null;
}

export interface CourseRecommendation {
  slug: string;
  name: string;
  score: number;
  group: string;
}

export interface CoursePreferences {
  answers: Record<string, string | string[]>;
  vector: ScoreVector;
  recommendations: CourseRecommendation[];
  savedAt?: string;
}

export interface UniversitySummary {
  id: string;
  name: string;
  shortName: string;
  city: string;
  region: string;
}

export function journeyOf(user: SiteUser | null): Journey | null {
  const profile = user?.profile;
  if (!profile?.journey_phase || !profile.university_id) return null;
  return {
    phase: profile.journey_phase,
    universityId: profile.university_id,
    courseName: profile.course_name,
    year: profile.study_year
  };
}
