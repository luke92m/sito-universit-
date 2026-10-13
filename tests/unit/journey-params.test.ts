import { describe, expect, it } from 'vitest';
import {
  FINDER_ANSWER_KEYS,
  bureaucracyHref,
  comparisonHref,
  finderSearchParams,
  finderStateFromParams,
  firstMissingAnswer,
  isCourseId,
  readFinderAnswers,
  universityOfCourse
} from '@/lib/flow/journey-params';
import { FINDER_CASES } from '../parity/cases.mjs';

const answers = FINDER_CASES[0].answers;

describe('link di "Trova la mia università"', () => {
  it('per default non contiene fascia ISEE e città', () => {
    const params = finderSearchParams({ answers });
    expect(params.get('mode')).toBe('university');
    expect(params.get('corso')).toBe('course:economia-aziendale');
    expect(params.get('regione')).toBe('Lombardia');
    expect(params.has('isee')).toBe(false);
    expect(params.has('citta')).toBe(false);
  });

  it('con il consenso li include e il link si rilegge identico', () => {
    const params = finderSearchParams({ answers, includeTelematic: true }, { includeSensitive: true });
    const state = finderStateFromParams(new URLSearchParams(params.toString()));
    expect(state?.answers).toEqual(answers);
    expect(state?.includeTelematic).toBe(true);
    expect(state?.includeDistance).toBe(false);
    expect(firstMissingAnswer(state!.answers, FINDER_ANSWER_KEYS)).toBe(-1);
  });

  it('scarta i valori non validi e indica la prima risposta mancante', () => {
    const params = new URLSearchParams({
      corso: 'course:informatica',
      livello: 'dottorato',
      regione: 'Atlantide',
      isee: '999',
      lingua: 'english'
    });
    const state = finderStateFromParams(params);
    expect(state?.answers).toEqual({ courseChoice: 'course:informatica', language: 'english' });
    expect(firstMissingAnswer(state!.answers, FINDER_ANSWER_KEYS)).toBe(1);
  });

  it('un indirizzo senza risposte non è un link del finder', () => {
    expect(finderStateFromParams(new URLSearchParams('mode=university'))).toBeNull();
  });

  it('l’API accetta solo tutte le risposte, come stringhe brevi', () => {
    expect(readFinderAnswers(answers)).toEqual(answers);
    expect(readFinderAnswers({ ...answers, language: 3 })).toBeNull();
    expect(readFinderAnswers({ ...answers, residenceCity: 'x'.repeat(121) })).toBeNull();
    expect(readFinderAnswers(null)).toBeNull();
  });
});

describe('collegamenti tra i passi', () => {
  it('corso → ateneo', () => {
    expect(isCourseId('ateneo-03701:45')).toBe(true);
    expect(isCourseId('ateneo-03701')).toBe(false);
    expect(isCourseId('../etc:1')).toBe(false);
    expect(universityOfCourse('ateneo-03701:45')).toBe('ateneo-03701');
  });

  it('comparatore e burocrazia precompilati', () => {
    expect(comparisonHref('ateneo-03701:45', 'ateneo-02701:6')).toBe(
      '/comparison?mode=courses&a=ateneo-03701%3A45&b=ateneo-02701%3A6'
    );
    expect(bureaucracyHref('ateneo-03701', 'ateneo-03701:45')).toBe(
      '/burocrazia?ateneo=ateneo-03701&corso=ateneo-03701%3A45'
    );
    expect(bureaucracyHref('ateneo-03701')).toBe('/burocrazia?ateneo=ateneo-03701');
  });
});
