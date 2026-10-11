// Stato del percorso di scelta (trova il corso → trova l'università → confronta → iscriviti) nell'URL.
// Modulo puro, utilizzabile da server e client: nessun account necessario per passare da un passo all'altro.
import { STUDENT_SERVICES } from '../data/student-services';
import type { FinderAnswers } from '../domain/university-finder';

export type FinderAnswerKey = keyof FinderAnswers;

export const FINDER_ANSWER_KEYS: FinderAnswerKey[] = [
  'courseChoice',
  'degree',
  'residenceRegion',
  'residenceCity',
  'commute',
  'relocation',
  'iseeRange',
  'language'
];

/** Nomi brevi e leggibili dei parametri. */
const PARAM_NAMES: Record<FinderAnswerKey, string> = {
  courseChoice: 'corso',
  degree: 'livello',
  residenceRegion: 'regione',
  residenceCity: 'citta',
  commute: 'pendolare',
  relocation: 'mobilita',
  iseeRange: 'isee',
  language: 'lingua'
};

/** Dati personali: entrano nel link condivisibile solo se l'utente lo sceglie. */
export const SENSITIVE_KEYS: readonly FinderAnswerKey[] = ['residenceCity', 'iseeRange'];

const CHOICES: Partial<Record<FinderAnswerKey, readonly string[]>> = {
  degree: ['bachelor', 'single', 'master', 'undecided'],
  commute: ['yes', 'no'],
  relocation: ['none', 'region', 'neighbors', 'italy'],
  language: ['italian', 'english', 'either']
};

function isValidAnswer(key: FinderAnswerKey, value: string): boolean {
  if (!value) return false;
  const choices = CHOICES[key];
  if (choices) return choices.includes(value);
  if (key === 'courseChoice') return /^(course|group):.{1,100}$/.test(value);
  if (key === 'residenceRegion') return STUDENT_SERVICES.regions.includes(value);
  if (key === 'iseeRange') return STUDENT_SERVICES.iseeRanges.some((range) => range.value === value);
  return value.length <= 80; // residenceCity: testo libero
}

/**
 * Risposte inviate all'API del finder: tutte le chiavi, solo stringhe brevi.
 * I valori vengono poi interpretati dal motore di punteggio, che ignora quelli sconosciuti.
 */
export function readFinderAnswers(source: unknown): FinderAnswers | null {
  if (!source || typeof source !== 'object') return null;
  const record = source as Record<string, unknown>;
  const answers = {} as FinderAnswers;
  for (const key of FINDER_ANSWER_KEYS) {
    const value = record[key];
    if (typeof value !== 'string' || value.length > 120) return null;
    answers[key] = value.trim();
  }
  return answers;
}

export interface FinderLinkState {
  answers: Partial<FinderAnswers>;
  includeTelematic: boolean;
  includeDistance: boolean;
}

/** Parametri del link ai risultati di "Trova la mia università". */
export function finderSearchParams(
  state: { answers: Partial<FinderAnswers>; includeTelematic?: boolean; includeDistance?: boolean },
  { includeSensitive = false } = {}
): URLSearchParams {
  const params = new URLSearchParams({ mode: 'university' });
  for (const key of FINDER_ANSWER_KEYS) {
    if (!includeSensitive && SENSITIVE_KEYS.includes(key)) continue;
    const value = (state.answers[key] || '').trim();
    if (isValidAnswer(key, value)) params.set(PARAM_NAMES[key], value);
  }
  if (state.includeTelematic) params.set('telematiche', '1');
  if (state.includeDistance) params.set('distanza', '1');
  return params;
}

/** Risposte valide lette da un link; null se il link non contiene risposte del finder. */
export function finderStateFromParams(params: URLSearchParams): FinderLinkState | null {
  const answers: Partial<FinderAnswers> = {};
  for (const key of FINDER_ANSWER_KEYS) {
    const value = (params.get(PARAM_NAMES[key]) || '').trim();
    if (isValidAnswer(key, value)) answers[key] = value;
  }
  if (!Object.keys(answers).length) return null;
  return {
    answers,
    includeTelematic: params.get('telematiche') === '1',
    includeDistance: params.get('distanza') === '1'
  };
}

/** Prima domanda ancora senza risposta valida, oppure -1 se il questionario è completo. */
export function firstMissingAnswer(answers: Partial<FinderAnswers>, order: readonly FinderAnswerKey[]): number {
  return order.findIndex((key) => !isValidAnswer(key, (answers[key] || '').trim()));
}

// --- Confronto e burocrazia ------------------------------------------------------------------

/** Gli id dei corsi hanno la forma "<idAteneo>:<indice>": l'ateneo si ricava dal corso. */
export function universityOfCourse(courseId: string): string {
  const index = courseId.lastIndexOf(':');
  return index > 0 ? courseId.slice(0, index) : '';
}

const COURSE_ID = /^[a-z0-9-]{1,40}:\d{1,5}$/;

export const isCourseId = (value: string | null | undefined): value is string => COURSE_ID.test(value || '');

/** Confronto tra due corsi precompilato. */
export function comparisonHref(leftCourseId: string, rightCourseId: string): string {
  return `/comparison?${new URLSearchParams({ mode: 'courses', a: leftCourseId, b: rightCourseId }).toString()}`;
}

/** Checklist di immatricolazione precompilata. */
export function bureaucracyHref(universityId: string, courseId = ''): string {
  const params = new URLSearchParams({ ateneo: universityId });
  if (courseId) params.set('corso', courseId);
  return `/burocrazia?${params.toString()}`;
}

/** Verifica della borsa precompilata (pagina pubblica). */
export function scholarshipHref(universityId: string, courseName = ''): string {
  const params = new URLSearchParams({ ateneo: universityId });
  if (courseName) params.set('corso', courseName);
  return `/borse?${params.toString()}`;
}
