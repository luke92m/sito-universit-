import { describe, expect, it } from 'vitest';
import { getUniversityById } from '@/lib/data';
import { conditionFromMunicipality, dsuEntityFor } from '@/lib/domain/dsu';
import { realCost } from '@/lib/domain/real-cost';

const kore = getUniversityById('ateneo-08601')!;

describe('Kore di Enna: borsa ERSU Enna ed esonero d’ateneo', () => {
  it('la borsa viene dall’ERSU di Enna, con la Tab. 8 e i servizi', () => {
    const entity = dsuEntityFor(kore.id)!;
    expect(entity.id).toBe('ersu-enna');
    const cost = realCost(kore, null, { min: 15000, max: 15000 }, { min: 20000, max: 20000 }, 'fuoriSede');
    expect(cost.scholarship?.status).toBe('eligible');
    expect(cost.lines.find((line) => line.key === 'borsa')?.max).toBe(4471.11);
    expect(cost.lines.find((line) => line.key === 'servizi')?.max).toBe(2700);
  });

  it('i comuni della Tab. 11 bis sono pendolari, anche con il nome ufficiale', () => {
    const entity = dsuEntityFor(kore.id)!;
    expect(conditionFromMunicipality(entity, 'Enna', 'Leonforte', false)?.condition).toBe('pendolare');
    expect(conditionFromMunicipality(entity, 'Enna Bassa', 'Valguarnera Caropepe', false)?.condition).toBe('pendolare');
    expect(conditionFromMunicipality(entity, 'Enna', 'Calascibetta', true)?.condition).toBe('inSede');
  });

  it('l’esonero della Tassa di Frequenza (2.500 €) è il caso migliore per gli idonei', () => {
    const cost = realCost(kore, null, { min: 15000, max: 15000 }, { min: 20000, max: 20000 }, 'inSede');
    const aid = cost.lines.find((line) => line.key === 'riduzione')!;
    expect(aid).toMatchObject({ min: 0, max: 2500 });
    const above = realCost(kore, null, { min: 40000, max: 40000 }, { min: 20000, max: 20000 }, 'inSede');
    expect(above.lines.some((line) => line.key === 'riduzione')).toBe(false);
  });
});

describe('università telematiche: borsa regionale da “in sede”', () => {
  it('DiSCo Lazio: Uninettuno è in sede d’ufficio e senza mensa', () => {
    const uninettuno = getUniversityById('ateneo-05813')!;
    expect(dsuEntityFor(uninettuno.id)?.id).toBe('disco-lazio');
    const cost = realCost(uninettuno, null, { min: 15000, max: 15000 }, { min: 20000, max: 20000 }, 'fuoriSede');
    expect(cost.condition).toBe('inSede');
    expect(cost.lines.some((line) => line.key === 'alloggio')).toBe(false);
    expect(cost.lines.some((line) => line.key === 'servizi')).toBe(false);
    expect(cost.lines.find((line) => line.key === 'borsa')?.label).toContain('in sede');
  });

  it('Toscana (IUL) e Abruzzo (Leonardo da Vinci) seguono il proprio bando', () => {
    for (const [id, entityId] of [
      ['ateneo-04804', 'dsu-toscana'],
      ['ateneo-06902', 'adsu-chieti-pescara']
    ]) {
      const university = getUniversityById(id)!;
      expect(dsuEntityFor(id)?.id).toBe(entityId);
      expect(realCost(university, null, { min: 15000, max: 15000 }, { min: 20000, max: 20000 }, 'pendolare').condition).toBe('inSede');
    }
  });

  it('gli atenei in presenza non cambiano', () => {
    const sapienza = getUniversityById('ateneo-05801')!;
    expect(realCost(sapienza, null, { min: 15000, max: 15000 }, { min: 20000, max: 20000 }, 'fuoriSede').condition).toBe('fuoriSede');
  });
});

describe('esoneri per gli idonei a fondi limitati (UNISG, LUM)', () => {
  it('valgono come caso migliore solo per chi ha la borsa', async () => {
    const { tuitionRuleFor, institutionalAidFor } = await import('@/lib/domain/tuition');
    for (const id of ['ateneo-00401', 'ateneo-07203']) {
      const rule = tuitionRuleFor(id)!;
      const isee = { min: 15000, max: 15000 };
      expect(institutionalAidFor(rule, isee, 10000, 10000, 'eligible')).toMatchObject({ min: 0, max: 10000 });
      expect(institutionalAidFor(rule, isee, 10000, 10000, 'not-eligible')).toBeNull();
    }
  });
});
