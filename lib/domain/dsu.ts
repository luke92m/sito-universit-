// Borsa di studio per ente regionale (DSU): soglie, importi per fascia ISEE e condizione dello studente.
// I dati arrivano dai bandi ufficiali (lib/data/dsu-entities.json); nessun valore è stimato.
import dsuJson from '../data/dsu-entities.json';
import { normalize } from './text';

export type StudentCondition = 'fuoriSede' | 'pendolare' | 'inSede';

export interface Source {
  label: string;
  url: string;
}

interface Municipality {
  comune: string;
  prov: string;
}

export interface DsuEntity {
  id: string;
  name: string;
  shortName: string;
  region: string;
  universityIds: string[];
  academicYear: string;
  verifiedAt: string;
  thresholds: { isee: number; ispe: number; source: Source };
  amounts: {
    note: string;
    bands: ({ iseeMax: number } & Record<StudentCondition, number>)[];
    source: Source;
  };
  increments: { label: string; iseeMax?: number; percent: number; conditional: string; source: Source }[];
  regionalTax: number;
  connectedBenefits: string[];
  connectedBenefitsSource: Source;
  conditions: Record<StudentCondition, string> & { source: Source };
  firstYearPayments: { steps: string[]; note: string; source: Source };
  application: { opens: string; closes: string; closesTime: string; note: string; source: Source };
  housing: {
    places: Record<string, number>;
    placesSource: Source;
    monthlyFees: Record<string, { min: number; max: number }>;
    monthlyFeesNote: string;
    monthlyFeesSource: Source;
  };
  municipalities: Record<string, { inSede: Municipality[]; pendolari: Municipality[]; source: Source }>;
  fundedShare: number | null;
  fundedShareNote: string;
  portal: Source;
}

export const DSU_ENTITIES = (dsuJson as unknown as { entities: DsuEntity[] }).entities;

export const CONDITION_LABELS: Record<StudentCondition, string> = {
  fuoriSede: 'Fuori sede',
  pendolare: 'Pendolare',
  inSede: 'In sede'
};

export function dsuEntityFor(universityId: string | null | undefined): DsuEntity | null {
  return DSU_ENTITIES.find((entity) => universityId && entity.universityIds.includes(universityId)) || null;
}

/** Nome di comune confrontabile: senza accenti, apostrofi uniformi, senza note tra parentesi. */
function municipalityKeys(value: string): string[] {
  const keys = [normalize(value.replace(/\(.*?\)/g, ' '))];
  // "Crespellano (ora Valsamoggia)": vale anche il nuovo comune indicato tra parentesi.
  const merged = value.match(/\(ora\s+([^)]+)\)/i);
  if (merged) keys.push(normalize(merged[1]));
  return keys;
}

export interface ConditionFromTable {
  condition: StudentCondition;
  /** 'tabella-1' / 'tabella-2': il comune è elencato dall'ente; 'fuori-tabella': il comune non è elencato. */
  origin: 'tabella-1' | 'tabella-2' | 'fuori-tabella';
  seat: string;
  source: Source;
}

/**
 * Condizione secondo le tabelle dei comuni dell'ente per la sede del corso.
 * null se l'ente non pubblica (o non abbiamo ancora inserito) la tabella per quella sede.
 */
export function conditionFromMunicipality(
  entity: DsuEntity,
  seatCity: string,
  residenceCity: string,
  rentsNearSeat: boolean
): ConditionFromTable | null {
  const seat = Object.keys(entity.municipalities).find((name) => normalize(name) === normalize(seatCity));
  if (!seat || !residenceCity.trim()) return null;
  const table = entity.municipalities[seat];
  const wanted = municipalityKeys(residenceCity)[0];
  const exact = (list: Municipality[]) => list.some((item) => municipalityKeys(item.comune)[0] === wanted);
  // Nome del comune attuale per una ex frazione (es. Valsamoggia): vale solo se non è in entrambe le tabelle.
  const merged = (list: Municipality[]) => list.some((item) => municipalityKeys(item.comune)[1] === wanted);
  const inSede = exact(table.inSede) || (merged(table.inSede) && !merged(table.pendolari));
  const pendolare = exact(table.pendolari) || (merged(table.pendolari) && !merged(table.inSede));
  if (inSede) return { condition: 'inSede', origin: 'tabella-1', seat, source: table.source };
  if (pendolare) return { condition: 'pendolare', origin: 'tabella-2', seat, source: table.source };
  if (merged(table.inSede) || merged(table.pendolari)) return null; // dipende dalla frazione: decide lo studente
  // Comune non elencato: oltre 90 minuti si è fuori sede solo prendendo casa in affitto vicino alla sede.
  return {
    condition: rentsNearSeat ? 'fuoriSede' : 'pendolare',
    origin: 'fuori-tabella',
    seat,
    source: table.source
  };
}

/** Valori economici: con il valore esatto min e max coincidono; null se sconosciuti. */
export interface EconomicRange {
  min: number | null;
  max: number | null;
}

export type ScholarshipStatus = 'eligible' | 'uncertain' | 'not-eligible' | 'unknown';

export interface ScholarshipEstimate {
  status: ScholarshipStatus;
  /** Importo annuo della borsa base (senza maggiorazioni condizionate). */
  amountMin: number;
  amountMax: number;
  /** Maggiorazioni a cui si potrebbe avere diritto, se restano risorse. */
  increments: DsuEntity['increments'];
  ispeUnknown: boolean;
}

const known = (range: EconomicRange) => range.min != null && range.max != null;

export function scholarshipFor(
  entity: DsuEntity,
  isee: EconomicRange,
  ispe: EconomicRange,
  condition: StudentCondition
): ScholarshipEstimate {
  const empty = { amountMin: 0, amountMax: 0, increments: [], ispeUnknown: !known(ispe) };
  if (!known(isee)) return { status: 'unknown', ...empty };
  const { isee: iseeLimit, ispe: ispeLimit } = entity.thresholds;
  const iseeMin = isee.min!;
  const iseeMax = isee.max!;
  if (iseeMin > iseeLimit || (known(ispe) && ispe.min! > ispeLimit))
    return { status: 'not-eligible', ...empty };

  const bands = entity.amounts.bands;
  const bandIndex = (value: number) => bands.findIndex((band) => value <= band.iseeMax);
  const first = bandIndex(iseeMin);
  const last = bandIndex(Math.min(iseeMax, iseeLimit));
  const amounts = bands.slice(first, last + 1).map((band) => band[condition]);
  const fullyInside = iseeMax <= iseeLimit && (!known(ispe) || ispe.max! <= ispeLimit);
  return {
    status: fullyInside ? 'eligible' : 'uncertain',
    amountMin: Math.min(...amounts),
    amountMax: Math.max(...amounts),
    increments: entity.increments.filter(
      (increment) => increment.iseeMax == null || iseeMin <= increment.iseeMax
    ),
    ispeUnknown: !known(ispe)
  };
}
