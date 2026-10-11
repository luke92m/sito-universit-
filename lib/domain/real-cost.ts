// "Quanto ti costa davvero": tasse per ISEE + quota fissa + casa e vita (se fuori sede) − borsa.
// Gira sul server (usa affitti e spese ISTAT). Ogni voce porta la sua fonte; le stime sono dichiarate.
import { CITY_SOURCES, roomRent, studentMonthlyEstimate } from './city-indicators';
import {
  CONDITION_LABELS,
  dsuEntityFor,
  scholarshipFor,
  type DsuEntity,
  type EconomicRange,
  type ScholarshipEstimate,
  type Source,
  type StudentCondition
} from './dsu';
import { contributionRange, degreeLevel, maxContribution, tuitionRuleFor, type TuitionRule } from './tuition';
import { getMetrics } from '../data';
import type { Course, University } from '../types';

export interface CostLine {
  key: 'tasse' | 'quota-fissa' | 'alloggio' | 'vita' | 'borsa';
  label: string;
  /** Importi annui; per la borsa sono positivi e vanno sottratti. */
  min: number;
  max: number;
  note: string;
  source: Source | null;
  /** true se il valore è una stima (media, indicatore territoriale), non una regola ufficiale. */
  estimated: boolean;
}

export interface RealCost {
  university: { id: string; name: string; city: string };
  seatCity: string;
  course: { name: string; level: string } | null;
  condition: StudentCondition;
  conditionLabel: string;
  /** Dati del bando (senza le tabelle dei comuni) da mostrare accanto al calcolo. */
  entity: Omit<DsuEntity, 'municipalities'> | null;
  scholarship: ScholarshipEstimate | null;
  lines: CostLine[];
  total: { min: number; max: number };
  /** Cosa non è ancora coperto da dati verificati. */
  missing: string[];
}

const RENT_SOURCE: Source = { label: 'Immobiliare.it Insights 2026, stanze singole', url: CITY_SOURCES.rent };
const SPENDING_SOURCE: Source = {
  label: 'ISTAT, spese per consumi delle famiglie 2024',
  url: CITY_SOURCES.spending
};
const MONTHS = 12;

function withoutMunicipalities(entity: DsuEntity): Omit<DsuEntity, 'municipalities'> {
  const { municipalities, ...rest } = entity;
  void municipalities;
  return rest;
}
const euro = (value: number) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    useGrouping: 'always'
  }).format(value);

function tuitionLines(
  rule: TuitionRule | null,
  university: University,
  course: Course | null,
  isee: EconomicRange,
  scholarship: ScholarshipEstimate | null,
  entity: DsuEntity | null
): CostLine[] {
  if (!rule) {
    const metrics = getMetrics(university.id);
    const average = Number(metrics.tuitionPayers || metrics.tuitionAllStudents || 0);
    if (!average) return [];
    return [
      {
        key: 'tasse',
        label: 'Tasse universitarie',
        min: average,
        max: average,
        note: 'Media pagata dagli iscritti che pagano: non dipende dal tuo ISEE. Le regole per fascia di questo ateneo non sono ancora nel sito.',
        source: {
          label: 'MUR, contribuzione e interventi 2025',
          url: 'https://dati-ustat.mur.gov.it/dataset/2025-contribuzione-e-interventi-atenei'
        },
        estimated: true
      }
    ];
  }
  const max = course ? maxContribution(rule, course) : rule.maxByLevel.triennale;
  const range = contributionRange(rule, isee, max);
  const exempt = scholarship?.status === 'eligible';
  const maybeExempt = scholarship?.status === 'uncertain';
  const refund = exempt && entity ? entity.regionalTax : 0;
  return [
    {
      key: 'tasse',
      label: 'Tasse universitarie',
      min: exempt || maybeExempt ? 0 : range.min,
      max: exempt ? 0 : range.max,
      note: exempt
        ? 'Esonero totale: spetta a chi è idoneo alla borsa.'
        : `${isee.min == null ? 'Senza ISEE si paga il massimo del corso' : 'Calcolate con la formula ufficiale per il tuo ISEE'} (massimo ${euro(max)}${course ? '' : ', corso triennale'}).`,
      source: rule.bandsSource,
      estimated: false
    },
    {
      key: 'quota-fissa',
      label: 'Tassa regionale, bollo e assicurazione',
      min: rule.fixedFees.total - refund,
      max: rule.fixedFees.total - refund,
      note: refund
        ? `Paghi ${euro(rule.fixedFees.total)} con la prima rata; i ${euro(refund)} di tassa regionale ti vengono rimborsati.`
        : rule.fixedFeesNote,
      source: rule.bandsSource,
      estimated: false
    }
  ];
}

export function realCost(
  university: University,
  course: Course | null,
  isee: EconomicRange,
  ispe: EconomicRange,
  condition: StudentCondition
): RealCost {
  const seatCity = course?.city || university.city;
  const entity = dsuEntityFor(university.id);
  const scholarship = entity ? scholarshipFor(entity, isee, ispe, condition) : null;
  const rule = tuitionRuleFor(university.id);
  const missing: string[] = [];
  const lines = tuitionLines(rule, university, course, isee, scholarship, entity);
  if (!rule) missing.push('Tasse per fascia ISEE di questo ateneo');

  if (condition === 'fuoriSede') {
    const rent = roomRent(seatCity, university.macroArea);
    const fees = entity?.housing.monthlyFees[seatCity];
    const places = entity?.housing.places[seatCity];
    lines.push({
      key: 'alloggio',
      label: 'Camera singola in affitto',
      min: rent.amount * MONTHS,
      max: rent.amount * MONTHS,
      note:
        `${MONTHS} mesi a ${euro(rent.amount)} (prezzo medio ${rent.exact ? `a ${rent.city}` : 'della zona'}).` +
        (fees && entity
          ? ` Con un posto alloggio ${entity.shortName} (${places ? `${new Intl.NumberFormat('it-IT', { useGrouping: 'always' }).format(places)} posti a ${seatCity}` : 'posti limitati'}) la retta è ${euro(fees.min)}–${euro(fees.max)} al mese ed è tolta dalla borsa.`
          : ''),
      source: RENT_SOURCE,
      estimated: true
    });
    const living = studentMonthlyEstimate(seatCity, university.macroArea);
    lines.push({
      key: 'vita',
      label: 'Spese di vita (cibo, trasporti, utenze, personali)',
      min: living.nonHousing * MONTHS,
      max: living.nonHousing * MONTHS,
      note: `Stima: ${euro(living.nonHousing)} al mese, pari al 24% della spesa media di una famiglia nel ${university.macroArea}.`,
      source: SPENDING_SOURCE,
      estimated: true
    });
  } else {
    missing.push('Spese di trasporto e personali di chi vive a casa (non stimate)');
  }

  if (scholarship && (scholarship.status === 'eligible' || scholarship.status === 'uncertain') && entity) {
    lines.push({
      key: 'borsa',
      label: `Borsa di studio ${entity.shortName} (${CONDITION_LABELS[condition].toLowerCase()})`,
      min: scholarship.status === 'uncertain' ? 0 : scholarship.amountMin,
      max: scholarship.amountMax,
      note:
        scholarship.status === 'uncertain'
          ? 'Il tuo ISEE o ISPE è vicino alla soglia: con il valore esatto sapresti se ti spetta.'
          : 'Importo annuo del bando per la tua fascia ISEE, pagato a rate se raggiungi i crediti richiesti.',
      source: entity.amounts.source,
      estimated: false
    });
  }
  if (!entity) missing.push('Bando per il diritto allo studio della regione di questo ateneo');

  const costs = lines.filter((line) => line.key !== 'borsa');
  const grant = lines.find((line) => line.key === 'borsa');
  const sum = (key: 'min' | 'max') => costs.reduce((total, line) => total + line[key], 0);
  const total = {
    min: Math.max(0, Math.round(sum('min') - (grant?.max || 0))),
    max: Math.max(0, Math.round(sum('max') - (grant?.min || 0)))
  };

  return {
    university: { id: university.id, name: university.name, city: university.city },
    seatCity,
    course: course ? { name: course.name, level: degreeLevel(course) } : null,
    condition,
    conditionLabel: CONDITION_LABELS[condition],
    entity: entity ? withoutMunicipalities(entity) : null,
    scholarship,
    lines,
    total,
    missing
  };
}
