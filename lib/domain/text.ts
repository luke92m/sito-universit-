// Normalizzazioni testuali usate dalla logica di dominio (porting fedele delle varianti legacy).

/** Minuscolo, senza accenti, solo [a-z0-9] separati da spazio. */
export function normalize(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Minuscolo e senza accenti, punteggiatura conservata (ricerca negli elenchi). */
export function normalizeSearch(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const byItalianName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'it');
