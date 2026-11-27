// Atenei che non usano l'ISEE: Cattolica (reddito equivalente), Humanitas (ISEP) per le tasse e la Provincia di
// Bolzano (VSE) per la borsa. Senza i dati dello studente si mostra la forbice minimo–massimo del regolamento;
// con i dati chiesti dal regolamento (facoltativi, nel risultato) si calcola l'importo.
import rulesJson from '../data/own-index-rules.json';
import type { EconomicRange, ScholarshipEstimate, Source } from './dsu';
import { degreeLevel, type DegreeLevel } from './tuition';
import { normalize } from './text';

/** Dati facoltativi per l'indicatore proprio. Ogni ateneo ne usa solo alcuni (vedi `OWN_INDEX_FIELDS`). */
export interface OwnIndexInput {
  /** Cattolica: reddito totale netto del nucleo. Humanitas: reddito imponibile del nucleo. */
  income?: number | null;
  /** Cattolica: componenti del nucleo familiare. */
  members?: number | null;
  /** Humanitas: valore catastale della prima casa. */
  firstHome?: number | null;
  /** Humanitas: valore catastale degli altri immobili. */
  otherHomes?: number | null;
  /** Humanitas: patrimonio mobiliare (titoli, fondi, conto oltre 10.000 €). */
  financial?: number | null;
  /** Humanitas: familiari fiscalmente a carico, studente compreso. */
  dependents?: number | null;
  /** Humanitas: affitto o rate del mutuo della casa principale pagati nel 2025. */
  rent?: number | null;
  /** Bolzano: VSE della dichiarazione DURP. */
  vse?: number | null;
  /** Bolzano: familiari che vivono fuori casa per studio. */
  away?: number | null;
}

export type OwnIndexField = keyof OwnIndexInput;

interface Bracket {
  upTo: number;
  base: number;
  rate: number;
  from: number;
}
interface Scheme {
  first: number;
  second: Record<DegreeLevel, number>;
  extra: number;
  perCoefficient: number;
  contribution: { brackets: Bracket[]; over: number };
}
type CattolicaCourse = { coef?: number; half?: boolean; fixed?: number; scheme?: string };
interface CattolicaRule {
  kind: 'cattolica';
  indexName: string;
  academicYear: string;
  verifiedAt: string;
  source: Source;
  divisors: number[];
  divisorStep: number;
  regionalTax: { advance: number; bands: { iseeMax: number | null; amount: number }[] };
  halfFifthMaxIncome: number;
  schemes: Record<string, Scheme>;
  coefficientRange: { min: number; max: number };
  courses: Record<string, CattolicaCourse>;
  exemption: string;
  exemptionSource: Source;
}
interface HumanitasRule {
  kind: 'humanitas';
  indexName: string;
  academicYear: string;
  verifiedAt: string;
  source: Source;
  groups: { label: string; nameIncludes: string[]; bands: { isepMax: number | null; amount: number }[] }[];
  cityDiscount: { city: string; amount: number; note: string };
  weights: {
    firstHome: number;
    otherHomes: number;
    financial: number;
    rent: number;
    dependentFrom: number;
    dependentCut: number;
  };
  noExemption: string;
}
interface VseRule {
  kind: 'vse';
  indexName: string;
  academicYear: string;
  verifiedAt: string;
  source: Source;
  portal: Source;
  awayCut: number;
  bands: { vseMax: number; amount: number }[];
  note: string;
}
type OwnIndexRule = CattolicaRule | HumanitasRule | VseRule;

const RULES = (rulesJson as unknown as { universities: Record<string, OwnIndexRule> }).universities;

export function ownIndexRuleFor(universityId: string | null | undefined): OwnIndexRule | null {
  return (universityId && RULES[universityId]) || null;
}

/** Campi da chiedere, con etichetta e aiuto, nell'ordine del modulo. */
export const OWN_INDEX_FIELDS: Record<
  OwnIndexRule['kind'],
  { key: OwnIndexField; label: string; help: string }[]
> = {
  cattolica: [
    {
      key: 'income',
      label: 'Reddito netto del nucleo (€)',
      help: 'Somma dei redditi 2025 dei familiari, tolte imposta netta e addizionali (730 o Certificazione Unica).'
    },
    { key: 'members', label: 'Persone nel nucleo familiare', help: 'Studente compreso.' }
  ],
  humanitas: [
    {
      key: 'income',
      label: 'Reddito imponibile del nucleo (€)',
      help: 'Redditi 2025 di tutti i familiari (730 rigo 14 o Redditi PF rigo RN4).'
    },
    {
      key: 'firstHome',
      label: 'Valore catastale della prima casa (€)',
      help: 'Rendita catastale × 1,05 × 100 per le abitazioni. Lascia vuoto se in affitto.'
    },
    {
      key: 'otherHomes',
      label: 'Valore catastale di altri immobili (€)',
      help: 'Stesso calcolo per seconde case e terreni edificabili.'
    },
    {
      key: 'financial',
      label: 'Risparmi e investimenti (€)',
      help: 'Titoli, fondi, azioni al 31/12/2025, più il conto corrente oltre 10.000 €.'
    },
    {
      key: 'dependents',
      label: 'Familiari a carico, studente compreso',
      help: 'Dal terzo in poi ognuno abbassa l’indicatore del 10%.'
    },
    {
      key: 'rent',
      label: 'Affitto o mutuo della casa pagato nel 2025 (€)',
      help: 'Il 25% si toglie dall’indicatore.'
    }
  ],
  vse: [
    {
      key: 'vse',
      label: 'VSE della tua dichiarazione DURP',
      help: 'Numero come 1,35: si chiede gratis a patronati e CAAF.'
    },
    { key: 'away', label: 'Familiari fuori casa per studio', help: 'Ognuno abbassa il VSE di 0,50.' }
  ]
};

/** Descrizione per l'interfaccia: nome dell'indicatore, campi da chiedere e se sono stati compilati. */
export interface OwnIndexInfo {
  kind: OwnIndexRule['kind'];
  indexName: string;
  /** Cosa calcola: le tasse o la borsa. */
  target: 'tasse' | 'borsa';
  fields: { key: OwnIndexField; label: string; help: string }[];
  filled: boolean;
  /** Valore dell'indicatore calcolato con i dati inseriti (null se mancano). */
  value: number | null;
  source: Source;
}

const cents = (value: number) => Math.round(value * 100) / 100;

/** Pulisce i dati arrivati dal browser: solo numeri non negativi e plausibili. */
export function parseOwnIndex(value: unknown): OwnIndexInput | null {
  if (!value || typeof value !== 'object') return null;
  const out: OwnIndexInput = {};
  for (const key of [
    'income',
    'members',
    'firstHome',
    'otherHomes',
    'financial',
    'dependents',
    'rent',
    'vse',
    'away'
  ] as const) {
    const raw = (value as Record<string, unknown>)[key];
    if (raw == null || raw === '') continue;
    const number = Number(raw);
    if (!Number.isFinite(number) || number < 0 || number > 100_000_000) return null;
    out[key] = number;
  }
  return Object.keys(out).length ? out : null;
}

// --- Cattolica -------------------------------------------------------------------------------------------------

function divisor(rule: CattolicaRule, members: number): number {
  const count = Math.max(1, Math.round(members));
  if (count <= rule.divisors.length) return rule.divisors[count - 1];
  return rule.divisors[rule.divisors.length - 1] + (count - rule.divisors.length) * rule.divisorStep;
}

/** Reddito equivalente = reddito totale netto / divisore familiare, arrotondato all'euro. */
export function equivalentIncome(rule: CattolicaRule, income: number, members: number): number {
  return Math.round(income / divisor(rule, members));
}

function contribution(scheme: Scheme, equivalent: number): number {
  const bracket = scheme.contribution.brackets.find((item) => equivalent <= item.upTo);
  if (!bracket) return scheme.contribution.over;
  return cents(bracket.base + bracket.rate * Math.max(0, equivalent - bracket.from));
}

function cattolicaCourse(rule: CattolicaRule, course: CourseLike | null): CattolicaCourse | null {
  if (!course) return null;
  return rule.courses[`${normalize(course.name)}|${normalize(course.city)}|${degreeLevel(course)}`] || null;
}

function regionalExtra(rule: CattolicaRule, isee: number | null): number {
  if (isee == null)
    return rule.regionalTax.bands[rule.regionalTax.bands.length - 1].amount - rule.regionalTax.advance;
  const band = rule.regionalTax.bands.find((item) => item.iseeMax == null || isee <= item.iseeMax)!;
  return band.amount - rule.regionalTax.advance;
}

/** Totale annuo per un reddito equivalente (null = forbice: dal minimo al massimo dello schema). */
function cattolicaTotal(
  rule: CattolicaRule,
  entry: CattolicaCourse | null,
  level: DegreeLevel,
  equivalent: number | null
) {
  if (entry?.fixed) return { min: entry.fixed, max: entry.fixed };
  const scheme = rule.schemes[entry?.scheme || 'padane'];
  const fixedPart = scheme.first + scheme.second[level] + scheme.extra;
  const coefficient = entry?.coef ?? null;
  const fifth = (coef: number, eq: number | null) =>
    // Quinta rata dimezzata per alcuni corsi umanistici, solo con reddito equivalente fino a 70.000 €.
    scheme.perCoefficient * coef * (entry?.half && eq != null && eq <= rule.halfFifthMaxIncome ? 0.5 : 1);
  const low = coefficient ?? rule.coefficientRange.min;
  const high = coefficient ?? rule.coefficientRange.max;
  if (equivalent == null) {
    return {
      min: fixedPart + contribution(scheme, 0) + fifth(low, entry?.half ? 0 : null),
      max: fixedPart + scheme.contribution.over + fifth(high, null)
    };
  }
  const income = contribution(scheme, equivalent);
  return {
    min: fixedPart + income + fifth(low, equivalent),
    max: fixedPart + income + fifth(high, equivalent)
  };
}

// --- Humanitas -------------------------------------------------------------------------------------------------

/** ISEP con i pesi del regolamento (par. 4.4): redditi + quote del patrimonio, meno le detrazioni principali. */
export function isepValue(rule: HumanitasRule, input: OwnIndexInput): number | null {
  if (input.income == null) return null;
  const w = rule.weights;
  const gross =
    input.income +
    (input.firstHome ?? 0) * w.firstHome +
    (input.otherHomes ?? 0) * w.otherHomes +
    (input.financial ?? 0) * w.financial;
  const dependentsCut = Math.max(0, (input.dependents ?? 0) - (w.dependentFrom - 1)) * w.dependentCut;
  return Math.max(0, Math.round(gross * Math.max(0, 1 - dependentsCut) - (input.rent ?? 0) * w.rent));
}

function humanitasGroup(rule: HumanitasRule, course: CourseLike | null) {
  if (!course) return null;
  const name = normalize(course.name);
  return (
    rule.groups.find((group) => group.nameIncludes.some((part) => name.includes(normalize(part)))) || null
  );
}

// --- Bolzano ---------------------------------------------------------------------------------------------------

export function vseAdjusted(rule: VseRule, input: OwnIndexInput): number | null {
  if (input.vse == null) return null;
  return Math.max(0, cents(input.vse - (input.away ?? 0) * rule.awayCut));
}

function vseAmount(rule: VseRule, vse: number): number {
  return rule.bands.find((band) => vse <= band.vseMax)?.amount ?? 0;
}

// --- Voci del costo --------------------------------------------------------------------------------------------

type CourseLike = { name: string; classCode: string; level?: string; group?: string; city?: string };

export interface OwnIndexTuition {
  min: number;
  max: number;
  note: string;
  source: Source;
  /** true se la forbice dipende ancora da dati non inseriti. */
  range: boolean;
}

const euro = (value: number) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    useGrouping: 'always'
  }).format(value);

const calcHint = (name: string) =>
  `L’ateneo non usa l’ISEE ma il suo ${name}: per questo vedi una forbice. Se vuoi, calcolalo qui sotto con i dati richiesti e la forbice diventa una stima precisa.`;

/** Tasse con l'indicatore proprio (Cattolica, Humanitas); null se l'ateneo usa l'ISEE o il corso non è coperto. */
export function ownIndexTuition(
  universityId: string,
  course: CourseLike | null,
  isee: EconomicRange,
  input: OwnIndexInput | null,
  scholarship: ScholarshipEstimate['status'] | null
): OwnIndexTuition | null {
  const rule = ownIndexRuleFor(universityId);
  if (!rule || rule.kind === 'vse') return null;
  if (rule.kind === 'cattolica') {
    const entry = cattolicaCourse(rule, course);
    const level = course ? degreeLevel(course) : 'triennale';
    const equivalent =
      input?.income != null && input.members ? equivalentIncome(rule, input.income, input.members) : null;
    const base = cattolicaTotal(rule, entry, level, equivalent);
    const extra = { min: regionalExtra(rule, isee.min), max: regionalExtra(rule, isee.max) };
    const total = { min: Math.round(base.min + extra.min), max: Math.round(base.max + extra.max) };
    const regional = rule.regionalTax.advance;
    if (scholarship === 'eligible')
      return {
        min: regional,
        max: regional,
        note: rule.exemption,
        source: rule.exemptionSource,
        range: false
      };
    const unknownCourse =
      !entry && !course?.name
        ? ''
        : !entry
          ? ' Il coefficiente di questo corso non è nella tabella: la forbice va dal coefficiente più basso al più alto.'
          : '';
    const how = entry?.fixed
      ? 'Importo fisso del corso, uguale per ogni reddito.'
      : equivalent == null
        ? calcHint(rule.indexName)
        : `Con un reddito equivalente di ${euro(equivalent)} (reddito netto diviso per il divisore familiare).`;
    return {
      min: scholarship === 'uncertain' ? regional : total.min,
      max: total.max,
      note: `${how}${unknownCourse} Include tassa regionale e bollo.${scholarship === 'uncertain' ? ` ${rule.exemption}` : ''}`,
      source: rule.source,
      range: !entry?.fixed && (equivalent == null || (!entry?.coef && !entry?.scheme))
    };
  }
  const group = humanitasGroup(rule, course);
  const isep = input ? isepValue(rule, input) : null;
  if (!group) {
    // Corso con importi non nel regolamento letto: media dichiarata. Senza corso: forbice su tutti i corsi.
    if (course) return null;
    const pick = (bands: HumanitasRule['groups'][number]['bands']) =>
      isep == null
        ? bands.map((band) => band.amount)
        : [bands.find((band) => band.isepMax == null || isep <= band.isepMax)!.amount];
    const all = rule.groups.flatMap((item) => pick(item.bands));
    return {
      min: Math.min(...all),
      max: Math.max(...all),
      note: `Gli importi cambiano molto da corso a corso: scegli il corso per una stima precisa.${isep == null ? ` ${calcHint(rule.indexName)}` : ` Con un ISEP di ${euro(isep)}.`} Include tassa regionale e bollo.`,
      source: rule.source,
      range: true
    };
  }
  const discount =
    course?.city && normalize(course.city) === normalize(rule.cityDiscount.city)
      ? rule.cityDiscount.amount
      : 0;
  const amounts = group.bands.map((band) => band.amount - discount);
  const exact =
    isep == null
      ? null
      : group.bands.find((band) => band.isepMax == null || isep <= band.isepMax)!.amount - discount;
  const single = amounts.length === 1;
  const note = [
    single
      ? 'Importo unico del corso, uguale per ogni reddito.'
      : exact == null
        ? calcHint(rule.indexName)
        : `Con un ISEP di ${euro(isep!)}.`,
    'Include tassa regionale e bollo.',
    discount ? rule.cityDiscount.note : '',
    scholarship === 'eligible' || scholarship === 'uncertain' ? rule.noExemption : ''
  ]
    .filter(Boolean)
    .join(' ');
  return {
    min: exact ?? Math.min(...amounts),
    max: exact ?? Math.max(...amounts),
    note,
    source: rule.source,
    range: exact == null && !single
  };
}

export interface OwnIndexScholarship {
  min: number;
  max: number;
  status: ScholarshipEstimate['status'];
  label: string;
  note: string;
  source: Source;
}

/** Borsa calcolata con l'indicatore proprio dell'ente (Bolzano: VSE). */
export function ownIndexScholarship(
  universityId: string,
  input: OwnIndexInput | null
): OwnIndexScholarship | null {
  const rule = ownIndexRuleFor(universityId);
  if (!rule || rule.kind !== 'vse') return null;
  const vse = input ? vseAdjusted(rule, input) : null;
  const top = rule.bands[0].amount;
  if (vse == null)
    return {
      min: 0,
      max: top,
      status: 'uncertain',
      label: 'Borsa della Provincia di Bolzano',
      note: `${rule.note} Senza il VSE vedi una forbice: se vuoi, inseriscilo qui sotto e la forbice diventa una stima precisa.`,
      source: rule.source
    };
  const amount = vseAmount(rule, vse);
  return {
    min: amount,
    max: amount,
    status: amount > 0 ? 'eligible' : 'not-eligible',
    label: 'Borsa della Provincia di Bolzano',
    note:
      amount > 0
        ? `Con un VSE di ${String(vse).replace('.', ',')}: importo per chi studia a tempo pieno. ${rule.note}`
        : `Con un VSE di ${String(vse).replace('.', ',')} si supera il limite di 5,00: la borsa non spetta.`,
    source: rule.source
  };
}

/** Cosa chiedere nel risultato per l'indicatore proprio dell'ateneo (null se usa l'ISEE). */
export function ownIndexInfo(universityId: string, input: OwnIndexInput | null): OwnIndexInfo | null {
  const rule = ownIndexRuleFor(universityId);
  if (!rule) return null;
  const value =
    rule.kind === 'cattolica'
      ? input?.income != null && input.members
        ? equivalentIncome(rule, input.income, input.members)
        : null
      : rule.kind === 'humanitas'
        ? input
          ? isepValue(rule, input)
          : null
        : input
          ? vseAdjusted(rule, input)
          : null;
  return {
    kind: rule.kind,
    indexName: rule.indexName,
    target: rule.kind === 'vse' ? 'borsa' : 'tasse',
    fields: OWN_INDEX_FIELDS[rule.kind],
    filled: value != null,
    value,
    source: rule.source
  };
}

/** Atenei con tasse (o borsa) calcolate da regolamento con un indicatore proprio. */
export const hasOwnIndexTuition = (universityId: string) => {
  const rule = ownIndexRuleFor(universityId);
  return Boolean(rule && rule.kind !== 'vse');
};
export const ownIndexScholarshipName = (universityId: string) =>
  ownIndexRuleFor(universityId)?.kind === 'vse' ? 'Provincia di Bolzano' : null;
