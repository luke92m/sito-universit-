import { describe, expect, it } from 'vitest';
import { getCourses, getUniversityById } from '@/lib/data';
import { STUDENT_SERVICES } from '@/lib/data/student-services';
import { DSU_ENTITIES, conditionFromMunicipality, dsuEntityFor, scholarshipFor } from '@/lib/domain/dsu';
import { realCost } from '@/lib/domain/real-cost';
import { contributionFor, degreeLevel, maxContribution, tuitionRuleFor } from '@/lib/domain/tuition';

// Valori attesi copiati a mano dai documenti ufficiali 2026/27 (bando ER.GO e sistema di calcolo UniBo).
const BOLOGNA = 'ateneo-03701';
const ergo = dsuEntityFor(BOLOGNA)!;
const exact = (value: number) => ({ min: value, max: value });
const none = { min: null, max: null };

describe('dati DSU: struttura e fonti', () => {
  it('ogni ente ha fonti https, data di verifica e atenei della sua regione', () => {
    for (const entity of DSU_ENTITIES) {
      expect(STUDENT_SERVICES.regions).toContain(entity.region);
      expect(entity.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const id of entity.universityIds) expect(getUniversityById(id)?.region).toBe(entity.region);
      const sources = [entity.thresholds.source, entity.amounts.source, entity.conditions.source, entity.portal];
      for (const source of sources) expect(source.url).toMatch(/^https:\/\//);
      const bands = entity.amounts.bands;
      expect(bands.at(-1)!.iseeMax).toBe(entity.thresholds.isee);
      for (const band of bands) expect(band.fuoriSede).toBeGreaterThan(band.pendolare);
    }
  });
});

describe('borsa ER.GO 2026/27', () => {
  it('soglie più basse di quelle nazionali', () => {
    expect(ergo.thresholds).toMatchObject({ isee: 25000, ispe: 50000 });
    expect(ergo.thresholds.isee).toBeLessThan(STUDENT_SERVICES.nationalThresholds.isee);
  });

  it('importo per fascia e condizione', () => {
    expect(scholarshipFor(ergo, exact(15000), exact(20000), 'fuoriSede')).toMatchObject({
      status: 'eligible',
      amountMin: 7171.11,
      amountMax: 7171.11
    });
    expect(scholarshipFor(ergo, exact(17000), none, 'pendolare')).toMatchObject({
      status: 'eligible',
      amountMin: 2723.96,
      ispeUnknown: true
    });
    expect(scholarshipFor(ergo, exact(22000), exact(10000), 'inSede').amountMin).toBe(1445.08);
  });

  it('oltre soglia ISEE o ISPE non si può fare domanda', () => {
    expect(scholarshipFor(ergo, exact(27000), exact(10000), 'fuoriSede').status).toBe('not-eligible');
    expect(scholarshipFor(ergo, exact(15000), exact(55000), 'fuoriSede').status).toBe('not-eligible');
  });

  it('con una fascia ISEE: intervallo di importi, incerto se attraversa la soglia', () => {
    expect(scholarshipFor(ergo, { min: 16000.01, max: 18000 }, none, 'fuoriSede')).toMatchObject({
      status: 'eligible',
      amountMin: 4661.22,
      amountMax: 7171.11
    });
    expect(scholarshipFor(ergo, { min: 24000.01, max: 26000 }, none, 'fuoriSede').status).toBe('uncertain');
    expect(scholarshipFor(ergo, none, none, 'fuoriSede').status).toBe('unknown');
  });

  it('maggiorazione del 15% solo con ISEE fino a 12.500 €', () => {
    const low = scholarshipFor(ergo, exact(12000), none, 'fuoriSede');
    const mid = scholarshipFor(ergo, exact(15000), none, 'fuoriSede');
    expect(low.increments.map((item) => item.percent)).toContain(15);
    expect(mid.increments.map((item) => item.percent)).not.toContain(15);
  });
});

describe('in sede, pendolare o fuori sede per la sede di Bologna', () => {
  const check = (city: string, rents = true) => conditionFromMunicipality(ergo, 'Bologna', city, rents);

  it('comuni delle tabelle ufficiali', () => {
    expect(check('Imola')).toMatchObject({ condition: 'inSede', origin: 'tabella-1' });
    expect(check('Modena')?.condition).toBe('inSede');
    expect(check('San Lazzaro di Savena')?.condition).toBe('inSede');
    expect(check('reggio emilia')).toMatchObject({ condition: 'pendolare', origin: 'tabella-2' });
    expect(check('Forlì')?.condition).toBe('pendolare');
    expect(check('Crespellano')?.condition).toBe('inSede');
  });

  it('comune non elencato: dipende dalla casa in affitto', () => {
    expect(check('Roma')).toMatchObject({ condition: 'fuoriSede', origin: 'fuori-tabella' });
    expect(check('Roma', false)?.condition).toBe('pendolare');
  });

  it('casi che il sito non decide da solo', () => {
    expect(check('Valsamoggia')).toBeNull(); // frazioni in tabelle diverse
    expect(conditionFromMunicipality(ergo, 'Forlì', 'Roma', true)).toBeNull(); // tabella non ancora inserita
  });
});

describe('tasse Università di Bologna 2026/27', () => {
  const rule = tuitionRuleFor(BOLOGNA)!;

  it('formula ufficiale per fascia ISEE', () => {
    expect(contributionFor(rule, 20000, 2040)).toBe(0);
    expect(contributionFor(rule, 27000, 2040)).toBe(0);
    expect(contributionFor(rule, 30000, 2040)).toBe(630);
    expect(contributionFor(rule, 40000, 2040)).toBe(1215);
    expect(contributionFor(rule, 50000, 2040)).toBe(1654.5);
    expect(contributionFor(rule, 58000, 4080)).toBe(2439);
    expect(contributionFor(rule, 58000, 2040)).toBe(2040);
    expect(contributionFor(rule, null, 2040)).toBe(2040);
  });

  it('livello dalla classe di laurea, anche quando il dataset sbaglia', () => {
    expect(degreeLevel({ classCode: 'LM-41', level: 'magistrale' })).toBe('ciclo-unico');
    expect(degreeLevel({ classCode: 'L-18', level: 'triennale' })).toBe('triennale');
    expect(degreeLevel({ classCode: 'LM-77', level: 'magistrale' })).toBe('magistrale');
  });

  it('massimo per corso, con le eccezioni ufficiali', () => {
    const courses = getCourses(BOLOGNA);
    const named = (name: string) => courses.find((course) => course.name === name)!;
    expect(maxContribution(rule, named('Medicine And Surgery'))).toBe(3315);
    expect(maxContribution(rule, named('Medicina e Chirurgia'))).toBe(2244);
    expect(maxContribution(rule, named('Genomics'))).toBe(2805);
    expect(maxContribution(rule, courses.find((course) => course.name.startsWith('Conservazione e Restauro'))!)).toBe(
      5916
    );
    expect(maxContribution(rule, courses.find((course) => course.classCode === 'L-18')!)).toBe(2040);
  });
});

describe('costo reale annuo', () => {
  const bologna = getUniversityById(BOLOGNA)!;
  const economia = getCourses(BOLOGNA).find((course) => course.classCode === 'L-18' && course.city === 'Bologna')!;

  it('fuori sede con ISEE basso: borsa, esonero e rimborso della tassa regionale', () => {
    const cost = realCost(bologna, economia, exact(15000), exact(20000), 'fuoriSede');
    const line = (key: string) => cost.lines.find((item) => item.key === key)!;
    expect(line('tasse').max).toBe(0);
    expect(line('quota-fissa').max).toBeCloseTo(17.04);
    expect(line('alloggio').max).toBe(585 * 12);
    expect(line('borsa').max).toBe(7171.11);
    const expected = Math.round(17.04 + 585 * 12 + line('vita').max - 7171.11);
    expect(cost.total).toEqual({ min: expected, max: expected });
    for (const item of cost.lines) expect(item.source?.url).toMatch(/^https:\/\//);
  });

  it('in sede con ISEE oltre soglia: nessuna borsa, tasse secondo la formula', () => {
    const cost = realCost(bologna, economia, exact(40000), exact(20000), 'inSede');
    expect(cost.lines.map((item) => item.key)).toEqual(['tasse', 'quota-fissa']);
    expect(cost.total.max).toBe(Math.round(1215 + 157.04));
    expect(cost.scholarship?.status).toBe('not-eligible');
  });

  it('ateneo senza dati verificati: media dichiarata come stima e dati mancanti elencati', () => {
    const padova = getUniversityById('ateneo-02801')!;
    const cost = realCost(padova, null, exact(15000), none, 'inSede');
    expect(cost.entity).toBeNull();
    expect(cost.lines[0]).toMatchObject({ key: 'tasse', estimated: true });
    expect(cost.missing.length).toBeGreaterThan(0);
  });
});
