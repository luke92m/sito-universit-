import { describe, expect, it } from 'vitest';
import { explainResult } from '@/lib/domain/finder-explain';
import { shortLabel } from '@/lib/domain/official-rankings';
import { rankCandidates, targetFromChoice, type FinderAnswers } from '@/lib/domain/university-finder';
import { FINDER_CASES } from '../parity/cases.mjs';

function results(name: string) {
  const testCase = FINDER_CASES.find((item) => item.name === name)!;
  const answers = testCase.answers as FinderAnswers;
  return rankCandidates(targetFromChoice(answers.courseChoice)!, answers, {}).map((item) => ({
    ...item,
    rankingText: shortLabel(item.ranking)
  }));
}

describe('perché te la proponiamo', () => {
  it('una frase per corso, geografia e ranking, più il costo se stimabile', () => {
    for (const item of results('economia-pavia').slice(0, 5)) {
      const reasons = explainResult(item);
      expect(reasons.slice(0, 3).map((reason) => reason.key)).toEqual(['course', 'geography', 'ranking']);
      expect(reasons.every((reason) => reason.text.length > 10)).toBe(true);
    }
  });

  it('il corso con lo stesso nome viene detto esplicitamente', () => {
    const exact = results('economia-pavia').find((item) => item.courseMatch.tier === 'exact')!;
    expect(explainResult(exact)[0].text).toContain('stesso nome');
  });

  it('chi resta nella sua città lo legge nella geografia', () => {
    const home = results('informatica-torino').find((item) => item.geography.mode === 'home')!;
    expect(explainResult(home).find((reason) => reason.key === 'geography')?.text).toBe('La sede è nella tua città.');
  });

  it('con il costo reale nella scheda non ripete la stima media', () => {
    const [first] = results('economia-pavia');
    expect(explainResult(first).some((reason) => reason.key === 'cost')).toBe(true);
    expect(explainResult({ ...first, realCost: {} }).some((reason) => reason.key === 'cost')).toBe(false);
  });

  it('per una macroarea cita l’area scelta', () => {
    const [first] = results('gruppo-economico');
    expect(explainResult(first)[0].text).toContain('area Economico');
  });
});
