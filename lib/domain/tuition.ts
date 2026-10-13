// Tasse universitarie per fascia ISEE, con le regole ufficiali dell'ateneo (lib/data/tuition-rules.json).
import tuitionJson from '../data/tuition-rules.json';
import type { Source } from './dsu';
import { normalize } from './text';

export type DegreeLevel = 'triennale' | 'ciclo-unico' | 'magistrale';

interface Band {
  iseeMax: number | null;
  from: number;
  rate: number;
  base: number;
}

export interface TuitionRule {
  name: string;
  academicYear: string;
  verifiedAt: string;
  appliesTo: string;
  fixedFees: { regionalTax: number; stampDuty: number; insurance: number; total: number };
  fixedFeesNote: string;
  bands: Band[];
  bandsSource: Source;
  maxByLevel: Record<DegreeLevel, number>;
  maxExceptions: { name: string; level: DegreeLevel; amount: number }[];
  maxNote: string;
  maxSource: Source;
  payments: { steps: string[]; note: string; source: Source };
  simulator: string;
}

const RULES = (tuitionJson as unknown as { universities: Record<string, TuitionRule> }).universities;

export function tuitionRuleFor(universityId: string | null | undefined): TuitionRule | null {
  return (universityId && RULES[universityId]) || null;
}

// Classi a ciclo unico: nel dataset MUR alcune risultano "magistrale" (es. LM-41 Medicina).
const SINGLE_CYCLE = /^(LM-41|LM-46|LM-13|LM-42|LM-4\s?c\.?u\.?|LM-85\s?bis|LMG\/01|LMR\/02)$/i;

export function degreeLevel(course: { classCode: string; level?: string }): DegreeLevel {
  const code = (course.classCode || '').trim();
  if (SINGLE_CYCLE.test(code) || course.level === 'ciclo-unico') return 'ciclo-unico';
  if (/^L[-/]/i.test(code)) return 'triennale';
  if (/^LM/i.test(code)) return 'magistrale';
  return course.level === 'magistrale' ? 'magistrale' : 'triennale';
}

/** Massimo del contributo per il corso: eccezione per nome se elencata, altrimenti massimo del livello. */
export function maxContribution(
  rule: TuitionRule,
  course: { name: string; classCode: string; level?: string }
): number {
  const level = degreeLevel(course);
  const name = normalize(course.name);
  const exception = rule.maxExceptions.find(
    (item) =>
      item.level === level && (name === normalize(item.name) || name.startsWith(`${normalize(item.name)} `))
  );
  return exception ? exception.amount : rule.maxByLevel[level];
}

const cents = (value: number) => Math.round(value * 100) / 100;

/** Contributo annuo (esclusa la quota fissa) per un valore ISEE; senza ISEE si paga il massimo. */
export function contributionFor(rule: TuitionRule, isee: number | null, max: number): number {
  if (isee == null) return max;
  const band = rule.bands.find((item) => item.iseeMax == null || isee <= item.iseeMax)!;
  return cents(Math.min(max, band.base + band.rate * Math.max(0, isee - band.from)));
}

/** Contributo per un intervallo ISEE (la formula cresce con l'ISEE: bastano gli estremi). */
export function contributionRange(
  rule: TuitionRule,
  isee: { min: number | null; max: number | null },
  max: number
) {
  if (isee.min == null || isee.max == null) return { min: max, max };
  return { min: contributionFor(rule, isee.min, max), max: contributionFor(rule, isee.max, max) };
}
