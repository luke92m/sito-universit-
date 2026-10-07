// Verifica orientativa della borsa DSU (porting da legacy/js/student-services.js). Utilizzabile nel client.
import { STUDENT_SERVICES } from '../data/student-services';
import type { Range } from '../types';

export type ScholarshipVerdict = 'possible' | 'unlikely' | 'uncertain' | 'unknown';

function normalize(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

export function residenceProfile(
  university: { city: string; region: string } | null,
  region: string,
  city: string
): string {
  if (!university || !region) return 'profilo non stimabile';
  if (city && normalize(city) === normalize(university.city)) return 'in sede (stima)';
  if (normalize(region) === normalize(university.region)) return 'pendolare (stima)';
  return 'fuori sede (stima)';
}

export function scholarshipVerdict(iseeRange: Range | null, ispeRange: Range | null): ScholarshipVerdict {
  if (!iseeRange || !ispeRange || iseeRange.max == null || ispeRange.max == null) return 'unknown';
  const limits = STUDENT_SERVICES.nationalThresholds;
  if (Number(iseeRange.min) > limits.isee || Number(ispeRange.min) > limits.ispe) return 'unlikely';
  if (iseeRange.max <= limits.isee && ispeRange.max <= limits.ispe) return 'possible';
  return 'uncertain';
}

export const VERDICT_COPY: Record<ScholarshipVerdict, { icon: string; title: string; text: string }> = {
  possible: {
    icon: '✓',
    title: 'Potresti avere i requisiti economici per presentare domanda.',
    text: 'Le fasce ISEE e ISPE indicate rientrano nei limiti massimi nazionali. La graduatoria ufficiale dipende anche da merito, documenti, residenza e regole del bando competente.'
  },
  unlikely: {
    icon: '!',
    title: 'Le fasce indicate sembrano superare almeno un limite nazionale.',
    text: 'Potrebbero comunque esistere agevolazioni diverse dalla borsa DSU. Controlla il bando dell’ateneo e dell’ente regionale.'
  },
  uncertain: {
    icon: '?',
    title: 'La fascia selezionata attraversa una soglia di riferimento.',
    text: 'Per una verifica migliore serve il valore preciso dell’ISEE/ISPE universitario e il bando ufficiale.'
  },
  unknown: {
    icon: '?',
    title: 'Non ci sono abbastanza dati per una verifica orientativa.',
    text: 'Puoi comunque aprire i portali ufficiali e controllare requisiti e scadenze.'
  }
};
