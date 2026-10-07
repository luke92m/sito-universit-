// Fasce ISEE/ISPE: compatibilità con i valori salvati dalle versioni precedenti.
import { STUDENT_SERVICES } from '../data/student-services';
import type { Range } from '../types';

const LEGACY_ISEE_VALUES: Record<string, string> = {
  '13000-18000': '16000-18000',
  '18000-22000': '20000-22000',
  '22000-26000': '24000-26000',
  '26000-limit': '28000-scholarship-limit',
  'over-limit': '30000-40000'
};

export function normalizedIseeValue(value: string | null | undefined): string {
  return LEGACY_ISEE_VALUES[value || ''] || value || '';
}

export function getIseeRange(value: string | null | undefined): Range | null {
  const normalized = normalizedIseeValue(value);
  return STUDENT_SERVICES.iseeRanges.find((range) => range.value === normalized) || null;
}

export function findRange(ranges: Range[], value: string | null | undefined): Range | null {
  return ranges.find((range) => range.value === value) || null;
}
