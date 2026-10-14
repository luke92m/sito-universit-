import { describe, expect, it } from 'vitest';
import { getUniversityById } from '@/lib/data';
import { choiceCalendar, curatedCalendarItems } from '@/lib/domain/choice-calendar';

describe('calendario della scelta: dati curati', () => {
  it('ogni voce ha fonte https e data di verifica; date solo se confermate', () => {
    for (const item of curatedCalendarItems()) {
      expect(item.source.url).toMatch(/^https:\/\//);
      expect(item.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (item.status === 'confermata') expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      else expect(item.date).toBeNull();
    }
  });

  it('gli atenei delle voci curate esistono', async () => {
    const json = (await import('@/lib/data/choice-calendar.json')).default as { universities: Record<string, unknown> };
    for (const id of Object.keys(json.universities)) expect(getUniversityById(id)).toBeTruthy();
  });
});

describe('calendario della scelta per ateneo', () => {
  it('Politecnico di Milano: test, ISEE e domanda di borsa con le date dell’anno scorso', () => {
    const items = choiceCalendar('ateneo-01502');
    expect(items.map((item) => item.kind)).toEqual(['test', 'isee', 'borsa']);
    const borsa = items.find((item) => item.kind === 'borsa')!;
    expect(borsa.title).toContain('2027/28');
    expect(borsa.status).toBe('non-pubblicata');
    expect(borsa.previous?.closes).toBe('2026-08-05');
  });

  it('ateneo senza dati curati né bando: solo la regola dell’ISEE', () => {
    expect(choiceCalendar('ateneo-07201').map((item) => item.kind)).toEqual(['isee']);
  });
});
