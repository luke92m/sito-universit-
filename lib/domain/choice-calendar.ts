// Calendario della scelta per un ateneo: ISEE, domanda di borsa e test d'ingresso, curati a mano.
// Solo fatti con fonte (lib/data/choice-calendar.json e il campo application dei bandi DSU): una data non
// ancora pubblicata resta "non pubblicata", con le date dell'anno precedente come riferimento dichiarato.
import calendarJson from '../data/choice-calendar.json';
import { dsuEntityFor, type Source } from './dsu';

export type CalendarKind = 'isee' | 'borsa' | 'test';

export interface CalendarItem {
  id: string;
  kind: CalendarKind;
  title: string;
  text: string;
  /** Data confermata (AAAA-MM-GG), oppure null se non ancora pubblicata. */
  date: string | null;
  /** regola: vale ogni anno; non-pubblicata: data attesa ma non ancora uscita; confermata: data ufficiale. */
  status: 'regola' | 'non-pubblicata' | 'confermata';
  /** Finestra dell'anno precedente, come riferimento. */
  previous?: { label: string; opens?: string; closes: string };
  source: Source;
  verifiedAt: string;
}

const CALENDAR = calendarJson as unknown as {
  national: CalendarItem[];
  universities: Record<string, CalendarItem[]>;
};

const KIND_ORDER: CalendarKind[] = ['test', 'isee', 'borsa'];

/** Anno accademico successivo a "2026/2027" → "2027/28". */
function nextYear(academicYear: string): string {
  const start = Number(academicYear.slice(0, 4)) + 1;
  return Number.isFinite(start) ? `${start}/${String(start + 1).slice(2)}` : 'prossimo anno';
}

function scholarshipItem(universityId: string): CalendarItem | null {
  const entity = dsuEntityFor(universityId);
  if (!entity) return null;
  const { application } = entity;
  return {
    id: `borsa-${entity.id}`,
    kind: 'borsa',
    title: `Domanda di borsa ${entity.shortName} per il ${nextYear(entity.academicYear)}`,
    text: `Il bando ${nextYear(entity.academicYear)} non è ancora uscito: qui sotto le date dell’anno scorso, come riferimento. ${application.note}`,
    date: null,
    status: 'non-pubblicata',
    previous: { label: `Domanda ${entity.academicYear}`, opens: application.opens, closes: application.closes },
    source: application.source,
    verifiedAt: entity.verifiedAt
  };
}

/** Voci del calendario per un ateneo: test (se curati), ISEE (per tutti), borsa (se il bando è nel sito). */
export function choiceCalendar(universityId: string): CalendarItem[] {
  const items = [
    ...(CALENDAR.universities[universityId] || []),
    ...CALENDAR.national,
    scholarshipItem(universityId)
  ].filter((item): item is CalendarItem => Boolean(item));
  return items.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
}

/** Tutte le voci curate a mano, per i controlli sui dati. */
export const curatedCalendarItems = (): CalendarItem[] => [
  ...CALENDAR.national,
  ...Object.values(CALENDAR.universities).flat()
];
