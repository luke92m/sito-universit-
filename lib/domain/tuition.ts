// Tasse universitarie per fascia ISEE, con le regole ufficiali dell'ateneo (lib/data/tuition-rules.json).
import tuitionJson from '../data/tuition-rules.json';
import type { Source } from './dsu';
import { normalize } from './text';

export type DegreeLevel = 'triennale' | 'ciclo-unico' | 'magistrale';

/**
 * Fascia ISEE: importo = base + rate × (ISEE − from), fino a iseeMax (null = senza limite).
 * Alcuni atenei usano curve: `square` aggiunge square × (ISEE − from)², `exp` aggiunge
 * scale × e^(−k / ISEE) (es. Sapienza, intervalli medio e asintotico).
 */
interface Band {
  iseeMax: number | null;
  from: number;
  rate: number;
  base: number;
  square?: number;
  exp?: { scale: number; k: number };
}

/** Gruppo di corsi con importi propri (es. UniPD: umanistico e scientifico). */
interface CourseGroup {
  id: string;
  label: string;
  /** Macroaree del dataset (campo `group` del corso) che appartengono al gruppo. */
  groups: string[];
  /** Corsi assegnati al gruppo per nome esatto (vince su tutto il resto). */
  names?: string[];
  /** Corsi assegnati al gruppo per nome, qualunque sia la macroarea. */
  nameIncludes?: string[];
  /** Livelli di corso del gruppo (es. Roma Tre: tabella propria per le lauree magistrali). */
  levels?: DegreeLevel[];
  default?: boolean;
  bands: Band[];
  max: number;
}

export interface TuitionRule {
  name: string;
  academicYear: string;
  verifiedAt: string;
  appliesTo: string;
  fixedFees: { regionalTax: number; stampDuty: number; insurance: number; total: number };
  fixedFeesNote: string;
  /** Tassa regionale che varia con l'ISEE (sostituisce fixedFees.regionalTax nel calcolo). */
  regionalTaxBands?: Band[];
  bands: Band[];
  bandsSource: Source;
  /** Il bando indica solo gli estremi delle fasce: tra gli estremi l'andamento lineare è una stima. */
  bandsNote?: string;
  maxByLevel: Record<DegreeLevel, number>;
  maxExceptions: { name: string; level: DegreeLevel; amount: number }[];
  courseGroups?: CourseGroup[];
  /** Riduzione per chi vive lontano dalla sede (es. Pisa): (from − contributo) × rate. */
  offSiteReduction?: { from: number; rate: number; note: string };
  maxNote: string;
  maxSource: Source;
  payments: { steps: string[]; note: string; source: Source };
  simulator: string;
}

type CourseLike = { name: string; classCode: string; level?: string; group?: string };

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

/** Gruppo di corsi dell'ateneo a cui appartiene il corso (o quello predefinito). */
export function courseGroup(rule: TuitionRule, course: CourseLike | null): CourseGroup | null {
  const groups = rule.courseGroups;
  if (!groups?.length) return null;
  const name = normalize(course?.name);
  const found =
    course &&
    (groups.find((group) => group.names?.some((item) => normalize(item) === name)) ||
      groups.find((group) => group.nameIncludes?.some((part) => name.includes(normalize(part)))) ||
      groups.find((group) => group.levels?.includes(degreeLevel(course))) ||
      groups.find((group) => group.groups.includes(course.group || '')));
  return found || groups.find((group) => group.default) || groups[0];
}

/** Massimo del contributo per il corso: gruppo di corsi, eccezione per nome o massimo del livello. */
export function maxContribution(rule: TuitionRule, course: CourseLike): number {
  const group = courseGroup(rule, course);
  if (group) return group.max;
  const level = degreeLevel(course);
  const name = normalize(course.name);
  const exception = rule.maxExceptions.find(
    (item) =>
      item.level === level && (name === normalize(item.name) || name.startsWith(`${normalize(item.name)} `))
  );
  return exception ? exception.amount : rule.maxByLevel[level];
}

const cents = (value: number) => Math.round(value * 100) / 100;

function bandValue(bands: Band[], isee: number): number {
  const band = bands.find((item) => item.iseeMax == null || isee <= item.iseeMax)!;
  const delta = Math.max(0, isee - band.from);
  const curve = band.exp && isee > 0 ? band.exp.scale * Math.exp(-band.exp.k / isee) : 0;
  return band.base + band.rate * delta + (band.square ?? 0) * delta * delta + curve;
}

/** Contributo annuo (esclusa la quota fissa) per un valore ISEE; senza ISEE si paga il massimo. */
export function contributionFor(
  rule: TuitionRule,
  isee: number | null,
  max: number,
  bands = rule.bands
): number {
  if (isee == null) return max;
  return cents(Math.min(max, bandValue(bands, isee)));
}

/** Contributo dopo la riduzione per chi vive lontano dalla sede, se l'ateneo la prevede. */
export function offSiteContribution(rule: TuitionRule, contribution: number): number {
  const reduction = rule.offSiteReduction;
  if (!reduction) return contribution;
  return cents(Math.max(0, contribution - Math.max(0, reduction.from - contribution) * reduction.rate));
}

/** Contributo per un intervallo ISEE (la formula cresce con l'ISEE: bastano gli estremi). */
export function contributionRange(
  rule: TuitionRule,
  isee: { min: number | null; max: number | null },
  max: number,
  bands = rule.bands
) {
  if (isee.min == null || isee.max == null) return { min: max, max };
  return {
    min: contributionFor(rule, isee.min, max, bands),
    max: contributionFor(rule, isee.max, max, bands)
  };
}

/** Quota fissa (tassa regionale, bollo, assicurazione) per un intervallo ISEE. */
export function fixedFeesRange(rule: TuitionRule, isee: { min: number | null; max: number | null }) {
  const other = rule.fixedFees.stampDuty + rule.fixedFees.insurance;
  const tax = (value: number | null) =>
    rule.regionalTaxBands && value != null
      ? cents(bandValue(rule.regionalTaxBands, value))
      : rule.fixedFees.regionalTax;
  const taxMin = tax(isee.min);
  const taxMax = tax(isee.max);
  return {
    min: cents(taxMin + other),
    max: cents(taxMax + other),
    regionalTax: { min: taxMin, max: taxMax }
  };
}
