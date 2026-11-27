import { describe, expect, it } from 'vitest';
import { getUniversityById } from '@/lib/data';
import { coverageOf } from '@/lib/domain/coverage';
import { parseOwnIndex } from '@/lib/domain/own-index';
import { realCost, summarizeRealCost } from '@/lib/domain/real-cost';
import type { Course } from '@/lib/types';

const course = (name: string, classCode: string, city: string): Course =>
  ({
    id: 'x',
    name,
    classCode,
    className: '',
    group: '',
    area: '',
    access: '',
    delivery: '',
    city,
    enrolled: 0,
    level: ''
  }) as unknown as Course;
const tuition = (cost: ReturnType<typeof realCost>) => cost.lines.find((line) => line.key === 'tasse')!;
const noIsee = { min: null, max: null };
const isee30 = { min: 30000, max: 30000 };

describe('Cattolica: reddito equivalente al posto dell’ISEE', () => {
  const cattolica = getUniversityById('ateneo-01504')!;
  const economia = course('Economia e gestione aziendale', 'L-18', 'Milano');

  it('senza dati mostra la forbice del regolamento (coefficiente 1,55 del corso)', () => {
    const line = tuition(realCost(cattolica, economia, noIsee, noIsee, 'inSede'));
    // 1.500 + 1.000 + 145 + 1,55 × 1.170, più il saldo della tassa regionale (190 − 130 senza ISEE).
    expect(line).toMatchObject({ min: 4519, max: 11437, estimated: false });
    expect(line.note).toContain('reddito equivalente');
  });

  it('con reddito netto e nucleo il calcolo è preciso', () => {
    const cost = realCost(cattolica, economia, isee30, isee30, 'inSede', null, { income: 60000, members: 4 });
    // Reddito equivalente 60.000: 1.888 + 8% × 20.000 = 3.488; tassa regionale 160 (saldo 30).
    expect(tuition(cost)).toMatchObject({ min: 7977, max: 7977 });
    expect(cost.ownIndex).toMatchObject({ filled: true, value: 60000, target: 'tasse' });
  });

  it('corsi a importo fisso e idonei EDUCatt', () => {
    const primaria = course('Scienze della formazione primaria', 'LM-85 bis', 'Milano');
    expect(tuition(realCost(cattolica, primaria, isee30, isee30, 'inSede'))).toMatchObject({
      min: 4100,
      max: 4100
    });
    const low = { min: 10000, max: 10000 };
    expect(tuition(realCost(cattolica, economia, low, low, 'inSede'))).toMatchObject({ min: 130, max: 130 });
  });
});

describe('Humanitas: fasce ISEP', () => {
  const humanitas = getUniversityById('ateneo-01510')!;
  const medicina = course('Medicina e Chirurgia', 'LM-41', 'Pieve Emanuele');

  it('forbice tra prima e quarta fascia, poi la fascia esatta', () => {
    expect(tuition(realCost(humanitas, medicina, noIsee, noIsee, 'inSede'))).toMatchObject({
      min: 10206,
      max: 23206
    });
    // 50.000 + 10% di 200.000 = 70.000, meno il 10% per il terzo familiare a carico = 63.000: terza fascia.
    const input = { income: 50000, firstHome: 200000, dependents: 3 };
    expect(tuition(realCost(humanitas, medicina, noIsee, noIsee, 'inSede', null, input))).toMatchObject({
      min: 19206,
      max: 19206
    });
  });

  it('a Catania la tassa regionale più bassa toglie 50 €', () => {
    const catania = course(
      'Infermieristica (Abilitante alla Professione Sanitaria di Infermiere)',
      'L/SNT1',
      'Catania'
    );
    expect(tuition(realCost(humanitas, catania, noIsee, noIsee, 'inSede'))).toMatchObject({
      min: 1656,
      max: 3656
    });
  });
});

describe('Bolzano: borsa provinciale con il VSE', () => {
  const unibz = getUniversityById('ateneo-02101')!;
  const grant = (input: Parameters<typeof realCost>[6]) =>
    realCost(unibz, null, noIsee, noIsee, 'fuoriSede', null, input).lines.find(
      (line) => line.key === 'borsa'
    );

  it('senza VSE la forbice va da 0 al massimo della tabella', () => {
    expect(grant(null)).toMatchObject({ min: 0, max: 6960 });
  });

  it('il VSE scende di 0,50 per ogni familiare fuori casa per studio', () => {
    expect(grant({ vse: 1.35 })).toMatchObject({ min: 4960, max: 4960 });
    expect(grant({ vse: 1.8, away: 1 })).toMatchObject({ min: 5380, max: 5380 });
    expect(grant({ vse: 6 })).toBeUndefined();
  });

  it('il riepilogo del finder dice che è una forbice', () => {
    const summary = summarizeRealCost(realCost(unibz, null, noIsee, noIsee, 'fuoriSede'));
    expect(summary.ownIndex?.target).toBe('borsa');
    expect(summary.scholarship).toEqual({ entity: 'Provincia di Bolzano', status: 'uncertain' });
  });
});

describe('copertura e dati in ingresso', () => {
  it('i tre atenei risultano coperti', () => {
    expect(coverageOf('ateneo-01504').tuition).toBe(true);
    expect(coverageOf('ateneo-01510').tuition).toBe(true);
    expect(coverageOf('ateneo-02101').scholarship).toBe('Provincia di Bolzano');
  });

  it('scarta valori non numerici o negativi', () => {
    expect(parseOwnIndex({ income: '45000', members: 3 })).toEqual({ income: 45000, members: 3 });
    expect(parseOwnIndex({ income: -1 })).toBeNull();
    expect(parseOwnIndex({ income: 'abc' })).toBeNull();
    expect(parseOwnIndex(null)).toBeNull();
  });
});
