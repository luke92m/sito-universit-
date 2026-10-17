// Voto di maturità (facoltativo): 60-100, con 101 per «100 e lode». Serve per gli sconti per merito sulle tasse
// e per i requisiti di voto minimo di alcune borse (es. 70/100 in Lombardia).

/** 60-100; 101 = 100 e lode; null = non indicato. */
export type DiplomaGrade = number | null;

export const HONORS = 101;

/** Legge il voto dal corpo di una richiesta: { grade: 60-100, honors?: boolean } oppure un numero. */
export function parseGrade(value: unknown): DiplomaGrade | undefined {
  if (value == null || value === '') return null;
  if (typeof value === 'number' || typeof value === 'string') {
    const grade = Number(value);
    if (!Number.isInteger(grade) || grade < 60 || grade > HONORS) return undefined;
    return grade;
  }
  if (typeof value !== 'object') return undefined;
  const { grade, honors } = value as { grade?: unknown; honors?: unknown };
  if (grade == null || grade === '') return null;
  const number = Number(grade);
  if (!Number.isInteger(number) || number < 60 || number > 100) return undefined;
  return number === 100 && honors === true ? HONORS : number;
}

export const gradeLabel = (grade: number) => (grade >= HONORS ? '100 e lode' : `${grade}/100`);

/** Sconto sulle tasse del primo anno per voto di maturità, come previsto dall'ateneo. */
export interface GradeReduction {
  /** Voto minimo (60-100, 101 = 100 e lode). Vale lo sconto con la soglia più alta raggiunta. */
  minGrade: number;
  /** Sconto in percentuale sul contributo (100 = esonero). */
  percent?: number;
  /** Parte del contributo esclusa dalla percentuale (es. prima rata uguale per tutti). */
  keep?: number;
  /** Sconto fisso in euro. */
  amount?: number;
  /** Il contributo diventa questo importo (rette agevolate per voto). */
  setTo?: number;
  /** Lo sconto vale solo fino a questo ISEE (es. Salento: sotto 40.000 €). */
  iseeMax?: number;
  note: string;
}

/** Sconto applicabile con il voto dato, oppure null. */
export function gradeReductionFor(
  reductions: GradeReduction[] | undefined,
  grade: DiplomaGrade,
  isee: number | null = null
): GradeReduction | null {
  if (!reductions?.length || grade == null) return null;
  const reached = reductions
    .filter((item) => grade >= item.minGrade && (item.iseeMax == null || (isee != null && isee <= item.iseeMax)))
    .sort((a, b) => b.minGrade - a.minGrade);
  return reached[0] || null;
}

/** Contributo dopo lo sconto per voto (mai negativo, mai più alto di prima). */
export function applyGradeReduction(contribution: number, reduction: GradeReduction | null): number {
  if (!reduction) return contribution;
  let value = contribution;
  if (reduction.setTo != null) value = Math.min(contribution, reduction.setTo);
  else if (reduction.percent != null) {
    const keep = Math.min(contribution, reduction.keep ?? 0);
    value = contribution - ((contribution - keep) * reduction.percent) / 100;
  } else if (reduction.amount != null) value = contribution - reduction.amount;
  return Math.max(0, Math.round(value * 100) / 100);
}

/** Intervalli di voto per i moduli: le soglie usate da atenei e bandi. Il calcolo usa il minimo dell'intervallo. */
export const GRADE_OPTIONS = [
  { value: '', label: 'Non lo so o non ancora' },
  { value: '60', label: '60-69' },
  { value: '70', label: '70-79' },
  { value: '80', label: '80-89' },
  { value: '90', label: '90-94' },
  { value: '95', label: '95-97' },
  { value: '98', label: '98-99' },
  { value: '100', label: '100' },
  { value: '101', label: '100 e lode' }
];
