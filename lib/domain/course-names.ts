// Nomi reali dei corsi (dataset MUR) senza doppioni: ricerca per nome e destinazione «corso preciso»
// del finder, per chi sa già quale corso vuole (es. «Informatica per il Management»).
// Gira solo sul server: usa l'intero dataset corsi.
import { UNIVERSITIES, getCourses } from '../data';
import { normalize } from './text';

/** Chiave di confronto di un titolo: minuscolo, senza accenti, senza le parti tra parentesi. */
export function courseTitleKey(value: unknown): string {
  return normalize(String(value || '').replace(/\([^)]*\)/g, ' '));
}

export interface CourseName {
  key: string;
  /** Grafia più frequente nel dataset. */
  name: string;
  /** Atenei con almeno un corso con questo nome. */
  universities: number;
  /** Macroarea più frequente tra i corsi con questo nome. */
  group: string;
  classCodes: string[];
  levels: string[];
}

let index: Map<string, CourseName> | null = null;

function mostFrequent(counts: Map<string, number>): string {
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'))[0]?.[0] || '';
}

function courseNameIndex(): Map<string, CourseName> {
  if (index) return index;
  const groups = new Map<
    string,
    { spellings: Map<string, number>; universities: Set<string>; groups: Map<string, number>; classes: Set<string>; levels: Set<string> }
  >();
  UNIVERSITIES.forEach((university) => {
    getCourses(university.id).forEach((course) => {
      const key = courseTitleKey(course.name);
      if (!key) return;
      let entry = groups.get(key);
      if (!entry) {
        entry = { spellings: new Map(), universities: new Set(), groups: new Map(), classes: new Set(), levels: new Set() };
        groups.set(key, entry);
      }
      const name = course.name.trim();
      entry.spellings.set(name, (entry.spellings.get(name) || 0) + 1);
      entry.universities.add(university.id);
      entry.groups.set(course.group, (entry.groups.get(course.group) || 0) + 1);
      if (course.classCode) entry.classes.add(course.classCode);
      if (course.level) entry.levels.add(course.level);
    });
  });
  index = new Map(
    Array.from(groups.entries()).map(([key, entry]) => [
      key,
      {
        key,
        name: mostFrequent(entry.spellings),
        universities: entry.universities.size,
        group: mostFrequent(entry.groups),
        classCodes: Array.from(entry.classes).sort(),
        levels: Array.from(entry.levels).sort()
      }
    ])
  );
  return index;
}

/** Nome di corso esistente nel dataset (confronto senza maiuscole, accenti e parentesi). */
export function findCourseName(name: string): CourseName | null {
  const key = courseTitleKey(name);
  return key ? courseNameIndex().get(key) || null : null;
}

/**
 * Nomi di corso che contengono tutte le parole cercate (anche solo l'inizio di una parola):
 * prima il nome identico, poi quelli che iniziano con la ricerca, poi i più diffusi.
 */
export function searchCourseNames(query: string, limit = 10): CourseName[] {
  const wanted = courseTitleKey(query);
  if (wanted.length < 2) return [];
  const tokens = wanted.split(' ');
  const hits = Array.from(courseNameIndex().values()).filter((entry) => {
    const words = entry.key.split(' ');
    return tokens.every((token) => words.some((word) => word.startsWith(token)));
  });
  const rank = (entry: CourseName) => (entry.key === wanted ? 0 : entry.key.startsWith(wanted) ? 1 : 2);
  return hits
    .sort((a, b) => rank(a) - rank(b) || b.universities - a.universities || a.name.localeCompare(b.name, 'it'))
    .slice(0, Math.max(1, limit));
}
