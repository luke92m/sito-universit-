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
  prov?: string;
  /** Nomi ufficiali quando il bando usa un'abbreviazione (es. "Fiano" → "Fiano Romano"). */
  aliases?: string[];
}

/**
 * Fascia ISEE: importi a inizio fascia. Con `endAt` l'importo cala in modo lineare fino ai valori
 * indicati dal bando per il limite della fascia (es. "gradualmente ridotta sino alla metà").
 */
export type AmountBand = { iseeMax: number; endAt?: Record<StudentCondition, number> } & Record<
  StudentCondition,
  number
>;

export interface DsuEntity {
  id: string;
  name: string;
  shortName: string;
  region: string;
  universityIds: string[];
  academicYear: string;
  verifiedAt: string;
  thresholds: { isee: number; ispe: number; source: Source };
  amounts: { note: string; bands: AmountBand[]; source: Source };
  /** Servizi gratuiti compresi nella borsa (mensa, alloggio), con il valore annuo dato dal bando. */
  inKind?: { items: Partial<Record<StudentCondition, { label: string; value: number }[]>>; source: Source };
  increments: { label: string; iseeMax?: number; percent?: number; conditional: string; source: Source }[];
  /** Requisiti in più per chi si iscrive al primo anno (es. voto minimo di maturità). */
  accessRequirement?: { text: string; source: Source };
  connectedBenefits: string[];
  connectedBenefitsSource: Source;
  conditions: Record<StudentCondition, string> & { source: Source };
  firstYearPayments: { steps: string[]; note: string; source: Source };
  application: { opens?: string; closes: string; closesTime?: string; note: string; source: Source };
  housing?: {
    places?: Record<string, number>;
    placesSource?: Source;
    monthlyFees?: Record<string, { min: number; max: number }>;
    monthlyFeesNote?: string;
    monthlyFeesSource?: Source;
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

/** Chiavi confrontabili di un comune: nome senza note tra parentesi, eventuale nuovo comune, alias. */
function municipalityKeys(item: Municipality): { exact: string[]; merged: string | null } {
  const exact = [normalize(item.comune.replace(/\(.*?\)/g, ' ')), ...(item.aliases || []).map(normalize)];
  // "Crespellano (ora Valsamoggia)": vale anche il nuovo comune indicato tra parentesi.
  const merged = item.comune.match(/\(ora\s+([^)]+)\)/i);
  return { exact, merged: merged ? normalize(merged[1]) : null };
}

/** Abbreviazioni usate nei bandi ("S. Cesareo", "Castel S. Pietro"). */
const expandSaint = (value: string) => normalize(value.replace(/\bS\.\s*/g, 'San '));

export interface ConditionFromTable {
  condition: StudentCondition;
  /** 'tabella-1' / 'tabella-2': il comune è elencato dall'ente; 'fuori-tabella': il comune non è elencato. */
  origin: 'tabella-1' | 'tabella-2' | 'fuori-tabella';
  seat: string;
  source: Source;
}

/**
 * Condizione secondo gli elenchi dei comuni dell'ente per la sede del corso.
 * null se l'ente non pubblica (o non abbiamo ancora inserito) l'elenco per quella sede.
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
  const wanted = normalize(residenceCity);
  const isExact = (item: Municipality) =>
    municipalityKeys(item).exact.includes(wanted) || expandSaint(item.comune) === wanted;
  const exact = (list: Municipality[]) => list.some(isExact);
  // Nome del comune attuale per una ex frazione (es. Valsamoggia): vale solo se non è in entrambi gli elenchi.
  const merged = (list: Municipality[]) => list.some((item) => municipalityKeys(item).merged === wanted);
  const inSede = exact(table.inSede) || (merged(table.inSede) && !merged(table.pendolari));
  const pendolare = exact(table.pendolari) || (merged(table.pendolari) && !merged(table.inSede));
  if (inSede) return { condition: 'inSede', origin: 'tabella-1', seat, source: table.source };
  if (pendolare) return { condition: 'pendolare', origin: 'tabella-2', seat, source: table.source };
  if (merged(table.inSede) || merged(table.pendolari)) return null; // dipende dalla frazione: decide lo studente
  // Comune non elencato: conta il tempo di viaggio; chi prende casa in affitto vicino alla sede è fuori sede.
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
  /** Valore annuo dei servizi gratuiti compresi nella borsa (mensa, alloggio). */
  inKind: { label: string; value: number }[];
  /** Maggiorazioni a cui si potrebbe avere diritto, se restano risorse. */
  increments: DsuEntity['increments'];
  ispeUnknown: boolean;
}

const known = (range: EconomicRange) => range.min != null && range.max != null;
const cents = (value: number) => Math.round(value * 100) / 100;

/** Importo della borsa per un valore ISEE già entro la soglia. */
export function amountAt(entity: DsuEntity, isee: number, condition: StudentCondition): number {
  const bands = entity.amounts.bands;
  const index = bands.findIndex((band) => isee <= band.iseeMax);
  const band = bands[index === -1 ? bands.length - 1 : index];
  if (!band.endAt) return band[condition];
  const start = index > 0 ? bands[index - 1].iseeMax : 0;
  const share = Math.min(1, Math.max(0, (isee - start) / (band.iseeMax - start)));
  return cents(band[condition] - (band[condition] - band.endAt[condition]) * share);
}

export function scholarshipFor(
  entity: DsuEntity,
  isee: EconomicRange,
  ispe: EconomicRange,
  condition: StudentCondition
): ScholarshipEstimate {
  const empty = { amountMin: 0, amountMax: 0, inKind: [], increments: [], ispeUnknown: !known(ispe) };
  if (!known(isee)) return { status: 'unknown', ...empty };
  const { isee: iseeLimit, ispe: ispeLimit } = entity.thresholds;
  const iseeMin = isee.min!;
  const iseeMax = isee.max!;
  if (iseeMin > iseeLimit || (known(ispe) && ispe.min! > ispeLimit))
    return { status: 'not-eligible', ...empty };

  // L'importo non cresce mai con l'ISEE: il massimo è all'inizio dell'intervallo, il minimo alla fine.
  const fullyInside = iseeMax <= iseeLimit && (!known(ispe) || ispe.max! <= ispeLimit);
  return {
    status: fullyInside ? 'eligible' : 'uncertain',
    amountMin: amountAt(entity, Math.min(iseeMax, iseeLimit), condition),
    amountMax: amountAt(entity, iseeMin, condition),
    inKind: entity.inKind?.items[condition] || [],
    increments: entity.increments.filter(
      (increment) => increment.iseeMax == null || iseeMin <= increment.iseeMax
    ),
    ispeUnknown: !known(ispe)
  };
}
