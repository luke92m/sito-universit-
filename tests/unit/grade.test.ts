import { describe, expect, it } from 'vitest';
import { getCourses, getUniversityById } from '@/lib/data';
import { dsuEntityFor, scholarshipFor } from '@/lib/domain/dsu';
import { applyGradeReduction, gradeReductionFor, HONORS, parseGrade } from '@/lib/domain/grade';
import { realCost } from '@/lib/domain/real-cost';
import { degreeLevel, tuitionRuleFor } from '@/lib/domain/tuition';

const exact = (value: number) => ({ min: value, max: value });
const none = { min: null, max: null };
const tuition = (cost: ReturnType<typeof realCost>) => cost.lines.find((line) => line.key === 'tasse')!;

describe('voto di maturità: lettura e sconti', () => {
  it('legge voti validi, la lode e il voto non indicato', () => {
    expect(parseGrade(undefined)).toBeNull();
    expect(parseGrade('')).toBeNull();
    expect(parseGrade(85)).toBe(85);
    expect(parseGrade({ grade: 100, honors: true })).toBe(HONORS);
    expect(parseGrade({ grade: 100, honors: false })).toBe(100);
    expect(parseGrade(59)).toBeUndefined();
    expect(parseGrade('abc')).toBeUndefined();
  });

  it('usa lo sconto con la soglia più alta raggiunta', () => {
    const list = [
      { minGrade: 95, amount: 100, note: '' },
      { minGrade: 100, amount: 175, note: '' }
    ];
    expect(gradeReductionFor(list, 90)).toBeNull();
    expect(gradeReductionFor(list, 98)?.amount).toBe(100);
    expect(gradeReductionFor(list, HONORS)?.amount).toBe(175);
    expect(applyGradeReduction(80, list[1])).toBe(0);
    expect(applyGradeReduction(5000, { minGrade: 100, percent: 20, keep: 1000, note: '' })).toBe(4200);
  });
});

describe('voto di maturità nel costo reale', () => {
  it('Pisa: 150 € in meno da 95/100, solo se il voto è indicato', () => {
    const pisa = getUniversityById('ateneo-05001')!;
    const base = tuition(realCost(pisa, null, exact(50000), none, 'inSede'));
    const withGrade = tuition(realCost(pisa, null, exact(50000), none, 'inSede', 96));
    expect(withGrade.max).toBe(base.max - 150);
    expect(withGrade.note).toContain('alla maturità');
    expect(realCost(pisa, null, exact(50000), none, 'inSede').missing.join(' ')).toContain('voto di maturità');
  });

  it('Salento: la riduzione vale solo sotto 40.000 € di ISEE', () => {
    const salento = getUniversityById('ateneo-07501')!;
    const low = tuition(realCost(salento, null, exact(35000), none, 'inSede', 100));
    const lowBase = tuition(realCost(salento, null, exact(35000), none, 'inSede'));
    const high = tuition(realCost(salento, null, exact(50000), none, 'inSede', 100));
    const highBase = tuition(realCost(salento, null, exact(50000), none, 'inSede'));
    expect(low.max).toBeCloseTo(lowBase.max * 0.6, 1);
    expect(high.max).toBe(highBase.max);
  });

  it('UNINT: retta agevolata per voto al primo anno di triennale, non in magistrale', () => {
    const unint = getUniversityById('ateneo-05809')!;
    const courses = getCourses('ateneo-05809');
    const triennale = courses.find((course) => degreeLevel(course) === 'triennale')!;
    const magistrale = courses.find((course) => degreeLevel(course) === 'magistrale')!;
    expect(tuition(realCost(unint, triennale, exact(30000), none, 'inSede', 85)).max).toBe(5400);
    expect(tuition(realCost(unint, magistrale, exact(30000), none, 'inSede', 85)).max).toBe(6900);
    expect(tuitionRuleFor('ateneo-05809')!.gradeReductions).toHaveLength(4);
  });

  it('Borse lombarde: sotto 70/100 al primo anno non si è idonei', () => {
    const bicocca = dsuEntityFor('ateneo-01509')!;
    expect(bicocca.minDiplomaGrade).toBe(70);
    const low = scholarshipFor(bicocca, exact(10000), none, 'fuoriSede', { grade: 65, firstCycle: true });
    expect(low).toMatchObject({ status: 'not-eligible', gradeTooLow: 70 });
    const unknown = scholarshipFor(bicocca, exact(10000), none, 'fuoriSede', { grade: null, firstCycle: true });
    expect(unknown).toMatchObject({ status: 'eligible', gradeRequired: 70 });
    const master = scholarshipFor(bicocca, exact(10000), none, 'fuoriSede', { grade: 65, firstCycle: false });
    expect(master.status).toBe('eligible');
  });
});
