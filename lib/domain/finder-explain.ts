// "Perché te lo proponiamo": frasi semplici ricavate dal risultato di "Trova la mia università".
// Non modifica il punteggio: legge soltanto i valori già calcolati. Utilizzabile nel client.
import type { FinderResult } from './university-finder';

export interface Reason {
  key: 'course' | 'geography' | 'ranking' | 'cost';
  text: string;
}

type ExplainInput = Pick<FinderResult, 'courseMatch' | 'course' | 'university' | 'geography' | 'ranking' | 'cost' | 'target'> & {
  rankingText?: string;
  /** Costo reale con ISEE e borsa: quando c'è, la scheda lo mostra e la stima media non si ripete. */
  realCost?: unknown;
};

const euro = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

function courseReason(item: ExplainInput): string {
  const name = `«${item.course.name}»`;
  if (item.target.type === 'group') return `Hai scelto l’area ${item.target.label}: qui c’è ${name}.`;
  switch (item.courseMatch.tier) {
    case 'exact':
      return `Hai cercato ${item.target.label}: qui c’è un corso con lo stesso nome.`;
    case 'close':
      return `${name} è molto vicino al corso che cerchi.`;
    case 'class':
      return `${name} è della stessa classe di laurea, ma con un focus diverso.`;
    default:
      return `${name} è della stessa area, non lo stesso corso: controlla il programma.`;
  }
}

function geographyReason(item: ExplainInput): string {
  const city = item.course.city || item.university.city;
  const minutes = item.geography.commute?.minutes;
  switch (item.geography.mode) {
    case 'home':
      return 'La sede è nella tua città.';
    case 'commute':
      return minutes
        ? `Puoi fare il pendolare: circa ${Math.round(minutes)} minuti stimati in treno regionale.`
        : 'Puoi fare il pendolare (tempo di viaggio stimato).';
    case 'online':
      return 'Il corso è a distanza.';
    default:
      return `Dovresti trasferirti a ${city}: rientra nella distanza che hai indicato.`;
  }
}

function rankingReason(item: ExplainInput): string {
  if (item.ranking.official && item.rankingText) return `Ranking ufficiale: ${item.rankingText}.`;
  return 'Per questo corso non c’è un ranking ufficiale collegato.';
}

function costReason(item: ExplainInput): string | null {
  if (item.realCost || item.cost.online || !Number.isFinite(item.cost.annual) || item.cost.annual <= 0) return null;
  const base = `Costo stimato: circa ${euro(item.cost.annual)} l’anno tra retta media e vita in città.`;
  return item.cost.needsAid ? `${base} Per la tua fascia ISEE è impegnativo: verifica la borsa.` : base;
}

export function explainResult(item: ExplainInput): Reason[] {
  const reasons: Reason[] = [
    { key: 'course', text: courseReason(item) },
    { key: 'geography', text: geographyReason(item) },
    { key: 'ranking', text: rankingReason(item) }
  ];
  const cost = costReason(item);
  if (cost) reasons.push({ key: 'cost', text: cost });
  return reasons;
}
