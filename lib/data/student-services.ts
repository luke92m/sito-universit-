// Dati di servizio (fasce ISEE/ISPE, regioni, portali, test): utilizzabili anche nel client.
import servicesJson from './student-services.json';
import type { Range, RegionalPortal, TestArea, TestQuestion } from '../types';

// JSON non può rappresentare Infinity: un limite superiore assente con minimo valorizzato è aperto.
function reviveRanges(ranges: Range[]): Range[] {
  return ranges.map((range) => (range.min != null && range.max == null ? { ...range, max: Infinity } : range));
}

const services = servicesJson as unknown as {
  version: number;
  referenceDate: string;
  academicYear: string;
  nationalThresholds: { isee: number; ispe: number };
  iseeRanges: Range[];
  ispeRanges: Range[];
  regions: string[];
  regionalPortals: Record<string, RegionalPortal>;
  officialDomains: Record<string, string>;
  testAreas: TestArea[];
  questionBanks: Record<string, TestQuestion[]>;
  sources: Record<string, string>;
};

export const STUDENT_SERVICES = {
  ...services,
  iseeRanges: reviveRanges(services.iseeRanges),
  ispeRanges: reviveRanges(services.ispeRanges)
};
