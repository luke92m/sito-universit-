import { describe, expect, it } from 'vitest';
import { getUniversityById } from '@/lib/data';
import { coverageOf, isFullyCovered, universitiesWithScholarship, universitiesWithTuition } from '@/lib/domain/coverage';
import { realCost, summarizeRealCost } from '@/lib/domain/real-cost';

const BOLOGNA = 'ateneo-03701';
// Ateneo telematico: nessun bando regionale e nessuna regola delle tasse nel sito.
const PEGASO = 'ateneo-06307';
const range = (min: number, max: number) => ({ min, max });
const none = { min: null, max: null };

describe('copertura dei dati verificati', () => {
  it('Bologna ha tasse per ISEE e bando ER.GO, Pegaso (telematica) nessuno dei due', () => {
    expect(coverageOf(BOLOGNA)).toEqual({ tuition: true, scholarship: 'ER.GO' });
    expect(isFullyCovered(BOLOGNA)).toBe(true);
    expect(coverageOf(PEGASO)).toEqual({ tuition: false, scholarship: null });
  });

  it('gli elenchi coincidono con i dati e sono in ordine alfabetico', () => {
    const tuition = universitiesWithTuition();
    expect(tuition.length).toBeGreaterThanOrEqual(11);
    expect(tuition.every((university) => coverageOf(university.id).tuition)).toBe(true);
    const names = tuition.map((university) => university.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'it')));
    expect(universitiesWithScholarship().length).toBeGreaterThan(tuition.length);
  });
});

describe('riassunto del costo reale (finder)', () => {
  const bologna = getUniversityById(BOLOGNA)!;
  const pegaso = getUniversityById(PEGASO)!;

  it('ha lo stesso totale del calcolo completo usato da /borse', () => {
    for (const condition of ['fuoriSede', 'pendolare', 'inSede'] as const) {
      const full = realCost(bologna, null, range(13000.01, 16000), none, condition);
      expect(summarizeRealCost(full).total).toEqual(full.total);
    }
  });

  it('con la borsa da pendolare la borsa supera le tasse: totale 0 e avanzo dichiarato', () => {
    const summary = summarizeRealCost(realCost(bologna, null, range(13000.01, 16000), none, 'pendolare'));
    expect(summary.total.max).toBe(0);
    expect(summary.surplus.max).toBeGreaterThan(0);
    expect(summary.tuitionVerified).toBe(true);
    expect(summary.scholarship).toEqual({ entity: 'ER.GO', status: 'eligible' });
  });

  it('ateneo non coperto: tasse medie dichiarate e nessuna borsa', () => {
    const summary = summarizeRealCost(realCost(pegaso, null, range(13000.01, 16000), none, 'fuoriSede'));
    expect(summary.tuitionVerified).toBe(false);
    expect(summary.scholarship).toBeNull();
    expect(summary.surplus).toEqual({ min: 0, max: 0 });
  });
});
