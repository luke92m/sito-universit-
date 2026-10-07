'use client';

import { useEffect, useState } from 'react';
import { generalCoursesSorted } from '../domain/course-catalog';

export interface CourseOption {
  id: string;
  name: string;
  classCode: string;
  level: string;
  group: string;
  city: string;
  access: string;
  delivery: string;
}

const cache = new Map<string, Promise<CourseOption[]>>();

export function fetchUniversityCourses(universityId: string): Promise<CourseOption[]> {
  if (!universityId) return Promise.resolve([]);
  let request = cache.get(universityId);
  if (!request) {
    request = fetch(`/api/universities/${encodeURIComponent(universityId)}/courses`)
      .then((response) => (response.ok ? response.json() : { courses: [] }))
      .then((payload) => (Array.isArray(payload.courses) ? payload.courses : []))
      .catch(() => {
        cache.delete(universityId);
        return [];
      });
    cache.set(universityId, request);
  }
  return request;
}

/** Corsi reali dell'ateneo, ordinati per nome. */
export function useUniversityCourses(universityId: string): { courses: CourseOption[]; loading: boolean } {
  const [state, setState] = useState<{ id: string; courses: CourseOption[] }>({ id: '', courses: [] });
  useEffect(() => {
    let active = true;
    if (!universityId) return;
    fetchUniversityCourses(universityId).then((courses) => {
      if (active) setState({ id: universityId, courses });
    });
    return () => {
      active = false;
    };
  }, [universityId]);
  const ready = state.id === universityId;
  return { courses: ready ? state.courses : [], loading: Boolean(universityId) && !ready };
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
