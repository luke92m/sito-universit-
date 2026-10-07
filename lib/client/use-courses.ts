'use client';

import { useEffect, useState } from 'react';
import { generalCoursesSorted } from '../domain/course-catalog';

export interface CourseOption {
  id: string;
  name: string;
  classCode: string;
  level: string;
  group: string;
  area: string;
  city: string;
  access: string;
  delivery: string;
}

export interface UniversityCoursesPayload {
  courses: CourseOption[];
  tuition: { payers: number | null; allStudents: number | null };
  academicYear: string;
}

const EMPTY: UniversityCoursesPayload = { courses: [], tuition: { payers: null, allStudents: null }, academicYear: '' };
const cache = new Map<string, Promise<UniversityCoursesPayload>>();

export function fetchUniversityCourses(universityId: string): Promise<UniversityCoursesPayload> {
  if (!universityId) return Promise.resolve(EMPTY);
  let request = cache.get(universityId);
  if (!request) {
    request = fetch(`/api/universities/${encodeURIComponent(universityId)}/courses`)
      .then((response) => (response.ok ? response.json() : EMPTY))
      .then((payload) => ({ ...EMPTY, ...payload, courses: Array.isArray(payload.courses) ? payload.courses : [] }))
      .catch(() => {
        cache.delete(universityId);
        return EMPTY;
      });
    cache.set(universityId, request);
  }
  return request;
}

/** Corsi reali dell'ateneo (ordinati per nome) e contribuzione media. */
export function useUniversityCourses(universityId: string): UniversityCoursesPayload & { loading: boolean } {
  const [state, setState] = useState<{ id: string; payload: UniversityCoursesPayload }>({ id: '', payload: EMPTY });
  useEffect(() => {
    let active = true;
    if (!universityId) return;
    fetchUniversityCourses(universityId).then((payload) => {
      if (active) setState({ id: universityId, payload });
    });
    return () => {
      active = false;
    };
  }, [universityId]);
  const ready = state.id === universityId;
  return { ...(ready ? state.payload : EMPTY), loading: Boolean(universityId) && !ready };
}

/**
 * Nomi dei corsi senza duplicati (porting di fillCourseSelect della v8): se l'ateneo non ha
 * corsi nel dataset, propone i corsi generali del catalogo.
 */
export function useCourseNameOptions(universityId: string): string[] {
  const { courses, loading } = useUniversityCourses(universityId);
  if (!universityId || loading) return [];
  const seen = new Set<string>();
  const names: string[] = [];
  courses.forEach((course) => {
    const key = course.name.trim().toLocaleLowerCase('it');
    if (seen.has(key)) return;
    seen.add(key);
    names.push(course.name);
  });
  return names.length ? names : generalCoursesSorted().map((course) => course.name);
}
