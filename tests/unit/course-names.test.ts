import { describe, expect, it } from 'vitest';
import { findCourseName, searchCourseNames } from '@/lib/domain/course-names';
import { rankCandidates, targetFromChoice, type FinderAnswers } from '@/lib/domain/university-finder';
import { finderStateFromParams } from '@/lib/flow/journey-params';

const answers: FinderAnswers = {
  courseChoice: 'name:Informatica per il Management',
  degree: 'bachelor',
  residenceRegion: 'Emilia-Romagna',
  residenceCity: 'Bologna',
  commute: 'yes',
  relocation: 'italy',
  iseeRange: '',
  language: 'either'
};

describe('corso cercato per nome', () => {
  it('trova i corsi reali anche con parole parziali e senza maiuscole', () => {
    const names = searchCourseNames('informatica manag').map((hit) => hit.name);
    expect(names).toContain('Informatica per il Management');
    expect(searchCourseNames('x')).toEqual([]);
  });

  it('mette prima il nome identico', () => {
    expect(searchCourseNames('informatica')[0].name.toLowerCase()).toBe('informatica');
  });

  it('il nome preciso diventa una destinazione del finder', () => {
    const target = targetFromChoice(answers.courseChoice)!;
    expect(target.type).toBe('name');
    expect(target.classCodes).toContain('L-31');
    expect(targetFromChoice('name:Corso che non esiste')).toBeNull();
    expect(findCourseName('informatica per il management')?.name).toBe('Informatica per il Management');
  });

  it('Bologna esce con il corso dallo stesso nome', () => {
    const results = rankCandidates(targetFromChoice(answers.courseChoice)!, answers, {});
    const bologna = results.find((item) => item.university.id === 'ateneo-03701')!;
    expect(bologna.course.name).toBe('Informatica per il Management');
    expect(bologna.courseMatch.tier).toBe('exact');
    // Gli altri atenei propongono corsi della stessa classe, non con lo stesso nome.
    expect(results.filter((item) => item.courseMatch.tier === 'exact').length).toBeGreaterThanOrEqual(1);
  });

  it('il link condiviso conserva il nome del corso', () => {
    const state = finderStateFromParams(new URLSearchParams({ mode: 'university', corso: answers.courseChoice }));
    expect(state?.answers.courseChoice).toBe(answers.courseChoice);
  });
});

describe('borse proprie dell’ateneo', () => {
  it('Bocconi4Access: con ISEE basso il caso migliore azzera la retta, ma non è garantito', async () => {
    const { realCost } = await import('@/lib/domain/real-cost');
    const { getUniversityById } = await import('@/lib/data');
    const bocconi = getUniversityById('ateneo-01503')!;
    const cost = realCost(bocconi, null, { min: 20000, max: 20000 }, { min: 10000, max: 10000 }, 'inSede');
    const tuition = cost.lines.find((line) => line.key === 'tasse')!;
    const aid = cost.lines.find((line) => line.key === 'riduzione')!;
    expect(aid.min).toBe(0);
    expect(aid.max).toBe(tuition.max);
    const high = realCost(bocconi, null, { min: 120000, max: 120000 }, { min: 10000, max: 10000 }, 'inSede');
    expect(high.lines.some((line) => line.key === 'riduzione')).toBe(false);
  });
});
