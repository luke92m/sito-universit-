import { describe, expect, it } from 'vitest';
import { getCourses, getUniversityById } from '@/lib/data';
import { STUDENT_SERVICES } from '@/lib/data/student-services';
import {
  DSU_ENTITIES,
  amountAt,
  conditionFromMunicipality,
  dsuEntityFor,
  scholarshipFor
} from '@/lib/domain/dsu';
import { realCost } from '@/lib/domain/real-cost';
import {
  contributionFor,
  courseGroup,
  degreeLevel,
  fixedFeesRange,
  isExcludedCourse,
  maxContribution,
  offSiteContribution,
  tuitionRuleFor
} from '@/lib/domain/tuition';

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
      const sources = [
        entity.thresholds.source,
        entity.amounts.source,
        entity.conditions.source,
        entity.portal
      ];
      for (const source of sources) expect(source.url).toMatch(/^https:\/\//);
      const bands = entity.amounts.bands;
      expect(bands.at(-1)!.iseeMax).toBe(entity.thresholds.isee);
      // L'importo non cresce mai al crescere dell'ISEE (la Toscana dà meno denaro ai fuori sede, ma l'alloggio).
      for (const condition of ['fuoriSede', 'pendolare', 'inSede'] as const) {
        let previous = Infinity;
        for (let isee = 0; isee <= entity.thresholds.isee; isee += 250) {
          const value = amountAt(entity, isee, condition);
          expect(value).toBeGreaterThan(0);
          expect(value).toBeLessThanOrEqual(previous);
          previous = value;
        }
      }
    }
  });

  it('elenchi dei comuni: sedi e fonti valide', () => {
    for (const entity of DSU_ENTITIES) {
      for (const [seat, table] of Object.entries(entity.municipalities)) {
        expect(table.inSede.length + table.pendolari.length).toBeGreaterThan(0);
        expect(table.source.url).toMatch(/^https:\/\//);
        expect(seat.length).toBeGreaterThan(2);
      }
    }
  });
});

describe('altri enti 2026/27: valori controllati sui bandi', () => {
  const entity = (universityId: string) => dsuEntityFor(universityId)!;
  const check = (universityId: string, seat: string, city: string, rents = true) =>
    conditionFromMunicipality(entity(universityId), seat, city, rents)?.condition;

  it('DiSCo Lazio (Sapienza): +15% fino a 14.169,94 €, poi calo lineare fino alla metà', () => {
    const disco = entity('ateneo-05801');
    expect(disco.thresholds).toMatchObject({ isee: 28339.88, ispe: 61608.48 });
    expect(amountAt(disco, 10000, 'fuoriSede')).toBe(7556.78);
    expect(amountAt(disco, 18000, 'fuoriSede')).toBe(6571.11);
    expect(amountAt(disco, 28339.88, 'fuoriSede')).toBe(3285.6);
    expect(amountAt(disco, (18893.25 + 28339.88) / 2, 'fuoriSede')).toBeCloseTo(4928.36, 1);
    expect(scholarshipFor(disco, exact(15000), none, 'inSede').inKind[0].value).toBe(600);
  });

  it('DiSCo Lazio: comuni pendolari per Roma, anche con il nome ufficiale', () => {
    expect(check('ateneo-05801', 'Roma', 'Roma')).toBe('inSede');
    expect(check('ateneo-05801', 'Roma', 'Fiano Romano')).toBe('pendolare');
    expect(check('ateneo-05801', 'Roma', 'San Cesareo')).toBe('pendolare');
    expect(check('ateneo-05801', 'Roma', 'Guidonia Montecelio')).toBe('pendolare');
    expect(check('ateneo-05801', 'Roma', 'Latina')).toBe('fuoriSede');
  });

  it('EDISU Piemonte (Torino)', () => {
    const edisu = entity('ateneo-00101');
    expect(edisu.thresholds).toMatchObject({ isee: 26306.25, ispe: 57187.53 });
    expect(amountAt(edisu, 20000, 'pendolare')).toBe(3202.57);
    expect(amountAt(edisu, 12000, 'fuoriSede')).toBe(8096.78);
    expect(scholarshipFor(edisu, exact(20000), exact(58000), 'pendolare').status).toBe('not-eligible');
    expect(check('ateneo-00101', 'Torino', 'Torino')).toBe('inSede');
  });

  it('DSU Toscana (Firenze): poco denaro ai fuori sede, ma mensa e alloggio gratuiti', () => {
    const dsut = entity('ateneo-04801');
    expect(dsut.thresholds).toMatchObject({ isee: 27000, ispe: 60000 });
    const fuori = scholarshipFor(dsut, exact(15000), none, 'fuoriSede');
    expect(fuori.amountMax).toBe(2262);
    expect(fuori.inKind.map((item) => item.value)).toEqual([1760, 3150]);
    expect(check('ateneo-04801', 'Firenze', 'Scandicci')).toBe('inSede');
    expect(check('ateneo-05001', 'Pisa', 'Cascina')).toBe('inSede');
  });

  it('Università di Padova: calo lineare oltre 17.537,50 €, ISPE fino a 43.125,94 €', () => {
    const unipd = entity('ateneo-02801');
    expect(amountAt(unipd, 12000, 'inSede')).toBe(3323);
    expect(amountAt(unipd, 20000, 'fuoriSede')).toBeCloseTo(6164.17, 0);
    expect(amountAt(unipd, 26306.25, 'pendolare')).toBe(2095.3);
    expect(scholarshipFor(unipd, exact(15000), exact(45000), 'inSede').status).toBe('not-eligible');
  });

  it('ADISURC Campania (Federico II): valori intermedi della tabella del bando', () => {
    const adisu = entity('ateneo-06301');
    expect(adisu.thresholds).toMatchObject({ isee: 25500, ispe: 54000 });
    expect(amountAt(adisu, 12000, 'inSede')).toBe(3323.68);
    expect(amountAt(adisu, 19833.33, 'fuoriSede')).toBeCloseTo(6310.5, 1);
    expect(amountAt(adisu, 22666.67, 'pendolare')).toBeCloseTo(2994.81, 1);
    expect(amountAt(adisu, 25500, 'fuoriSede')).toBe(4589.28);
    expect(check('ateneo-06301', 'Napoli', 'Portici')).toBe('inSede');
  });

  it('Milano-Bicocca: fasce regionali e voto minimo di maturità', () => {
    const mib = entity('ateneo-01509');
    expect(amountAt(mib, 15000, 'fuoriSede')).toBe(6343);
    expect(scholarshipFor(mib, exact(27000), none, 'fuoriSede').status).toBe('not-eligible');
    expect(mib.accessRequirement?.text).toContain('70/100');
  });

  it('Statale e Politecnico di Milano: stessi importi regionali, senza voto minimo di maturità', () => {
    for (const id of ['ateneo-01501', 'ateneo-01502']) {
      const lombardia = entity(id);
      expect(lombardia.thresholds).toMatchObject({ isee: 26887.93, ispe: 58452.06 });
      expect(amountAt(lombardia, 10000, 'inSede')).toBe(2601);
      expect(amountAt(lombardia, 15000, 'pendolare')).toBe(3362);
      expect(amountAt(lombardia, 20000, 'fuoriSede')).toBe(5028);
      expect(scholarshipFor(lombardia, exact(15000), none, 'inSede').inKind[0].value).toBe(829);
      expect(scholarshipFor(lombardia, exact(20000), exact(60000), 'inSede').status).toBe('not-eligible');
      expect(lombardia.accessRequirement).toBeUndefined();
    }
    expect(entity('ateneo-01501').shortName).toBe('Statale di Milano');
    expect(entity('ateneo-01502').shortName).toBe('Politecnico di Milano');
  });
});

describe('tasse Università di Padova 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-02801')!;
  const courses = getCourses('ateneo-02801');
  const ingegneria = courses.find((course) => course.name === 'Ingegneria Civile')!;
  const economia = courses.find((course) => course.name === 'Economia')!;

  it('gruppi di corsi e massimi', () => {
    expect(courseGroup(rule, ingegneria)?.id).toBe('B');
    expect(courseGroup(rule, economia)?.id).toBe('A');
    expect(maxContribution(rule, ingegneria)).toBe(2990);
    expect(maxContribution(rule, economia)).toBe(2790);
  });

  it('no-tax area fino a 30.000 € e fasce lineari tra gli estremi del bando', () => {
    const bandsA = courseGroup(rule, economia)!.bands;
    const bandsB = courseGroup(rule, ingegneria)!.bands;
    expect(contributionFor(rule, 25000, 2790, bandsA)).toBe(0);
    expect(contributionFor(rule, 40000, 2790, bandsA)).toBe(1205);
    expect(contributionFor(rule, 40000, 2990, bandsB)).toBe(1367.5);
    expect(contributionFor(rule, 50000, 2790, bandsA)).toBe(1850);
    expect(contributionFor(rule, 80000, 2990, bandsB)).toBe(2990);
  });

  it('tassa regionale veneta che cresce con l’ISEE', () => {
    expect(fixedFeesRange(rule, exact(10000)).regionalTax.min).toBeCloseTo(159.33, 1);
    expect(fixedFeesRange(rule, exact(40000)).regionalTax.min).toBe(192);
    expect(fixedFeesRange(rule, none).max).toBe(208);
  });
});

describe('tasse Università di Torino 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-00101')!;

  it('formule dell’art. 3.1 per le matricole a tempo pieno', () => {
    expect(contributionFor(rule, 26000, 2785)).toBe(0);
    expect(contributionFor(rule, 30000, 2785)).toBe(422.06);
    expect(contributionFor(rule, 40000, 2785)).toBe(1025);
    expect(contributionFor(rule, 60000, 2785)).toBe(1807.22);
    expect(contributionFor(rule, 85000, 2785)).toBe(2785);
  });

  it('massimo di 2.785 € al primo anno oltre 85.000 € e senza ISEE, prima rata di 156 €', () => {
    expect(rule.maxByLevel.triennale).toBe(2785);
    expect(contributionFor(rule, 90000, 2785)).toBe(2785);
    expect(contributionFor(rule, null, 2785)).toBe(2785);
    expect(fixedFeesRange(rule, none).max).toBe(156);
  });

  // Punti presi dal simulatore ufficiale (simulatore.tasse.unito.it, 1° anno, tempo pieno, 17/10/2026).
  it('coincide con il simulatore ufficiale UniTo', () => {
    const official: [number, number][] = [[20000, 0], [30000, 422.06], [50000, 1416.11], [70000, 2198.33], [80000, 2589.44], [100000, 2785]];
    for (const [isee, value] of official) expect(contributionFor(rule, isee, rule.maxByLevel.triennale)).toBeCloseTo(value, 1);
  });
});

describe('tasse Politecnico di Torino 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-00102')!;

  it('no-tax area fino a 30.000 € e formula quadratica dell’Appendice', () => {
    expect(contributionFor(rule, 30000, 3600)).toBe(0);
    expect(contributionFor(rule, 30000.01, 3600)).toBe(600.04);
    expect(contributionFor(rule, 40000, 3600)).toBe(904.34);
    expect(contributionFor(rule, 50000, 3600)).toBe(1250.06);
    expect(contributionFor(rule, 70000, 3600)).toBe(2065.8);
  });

  it('massimo di 3.600 € da 100.000 € e senza ISEE, prima rata di 161 €', () => {
    expect(contributionFor(rule, 100000, 3600)).toBe(3600);
    expect(contributionFor(rule, 120000, 3600)).toBe(3600);
    expect(contributionFor(rule, null, 3600)).toBe(3600);
    expect(fixedFeesRange(rule, none).max).toBe(161);
  });
});

describe('tasse Università di Firenze 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-04801')!;

  it('fasce dell’Allegato 1 per le matricole a tempo pieno', () => {
    expect(contributionFor(rule, 24000, 2744)).toBe(0);
    expect(contributionFor(rule, 24000.01, 2744)).toBe(350);
    expect(contributionFor(rule, 30000, 2744)).toBe(535);
    expect(contributionFor(rule, 35000, 2744)).toBe(720);
    expect(contributionFor(rule, 46500, 2744)).toBe(1090.2);
    expect(contributionFor(rule, 90000, 2744)).toBe(2685.2);
  });

  it('fascia massima oltre 90.000 € e senza ISEE', () => {
    expect(contributionFor(rule, 95000, 2744)).toBe(2744);
    expect(contributionFor(rule, null, 2744)).toBe(2744);
  });

  it('costo reale in sede uguale al totale annuo della tabella ufficiale', () => {
    const firenze = getUniversityById('ateneo-04801')!;
    const cost = realCost(firenze, null, exact(35000), exact(20000), 'inSede');
    expect(cost.lines.map((item) => item.key)).toEqual(['tasse', 'quota-fissa']);
    expect(cost.total.max).toBe(876);
  });
});

describe('tasse Federico II 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-06301')!;

  it('contributo agevolato delle matricole, come nel calcolatore ufficiale', () => {
    expect(contributionFor(rule, 30000, 2384)).toBe(0);
    expect(contributionFor(rule, 30000.01, 2384)).toBe(1011.5);
    expect(contributionFor(rule, 32000, 2384)).toBe(1230.25);
    expect(contributionFor(rule, 34000, 2384)).toBe(1470);
    expect(contributionFor(rule, 37000, 2384)).toBe(1640);
    expect(contributionFor(rule, 50000, 2384)).toBe(1965);
    expect(contributionFor(rule, 70000, 2384)).toBe(2254.5);
  });

  it('massimo di 2.384 € da 80.000 € e senza ISEE, tassa regionale campana per ISEE', () => {
    expect(contributionFor(rule, 80000, 2384)).toBe(2384);
    expect(contributionFor(rule, null, 2384)).toBe(2384);
    expect(fixedFeesRange(rule, exact(20000)).regionalTax.min).toBe(130);
    expect(fixedFeesRange(rule, exact(40000)).regionalTax.min).toBe(151);
    expect(fixedFeesRange(rule, none).max).toBe(189);
  });
});

describe('tasse Milano-Bicocca 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-01509')!;
  const courses = getCourses('ateneo-01509');
  const named = (name: string) => courses.find((course) => course.name === name)!;
  const areaA = courseGroup(rule, named('Economia e Finanza'))!;
  const areaB = courseGroup(rule, named('Fisica'))!;
  const pay = (isee: number | null, group = areaA) => contributionFor(rule, isee, group.max, group.bands);

  it('aree di contribuzione dell’Appendice 1, anche quando la macroarea non basta', () => {
    expect(areaA.id).toBe('A');
    expect(areaB.id).toBe('B');
    expect(courseGroup(rule, named('Servizio Sociale'))?.id).toBe('A');
    expect(courseGroup(rule, named('Biostatistica'))?.id).toBe('A');
    expect(courseGroup(rule, named('Comunicazione Interculturale'))?.id).toBe('B');
    expect(courseGroup(rule, named('Scienze della Formazione Primaria'))?.id).toBe('B');
  });

  it('formula (ISEE/1000)² × k × 0,87 per le matricole, fino al massimo da 76.000 €', () => {
    expect(pay(30000)).toBe(0);
    expect(pay(30500)).toBe(480.36);
    expect(pay(40000)).toBe(826.43);
    expect(pay(60000)).toBe(1859.47);
    expect(pay(40000, areaB)).toBe(991.8);
    expect(pay(76000)).toBe(2983.23);
    expect(pay(null, areaB)).toBe(3580.05);
  });

  it('tassa regionale lombarda per ISEE e costo reale in sede', () => {
    expect(fixedFeesRange(rule, exact(20000)).regionalTax.min).toBe(130);
    expect(fixedFeesRange(rule, exact(40000)).regionalTax.min).toBe(160);
    expect(fixedFeesRange(rule, none).max).toBe(206);
    const bicocca = getUniversityById('ateneo-01509')!;
    const cost = realCost(bicocca, named('Economia e Finanza'), exact(40000), exact(20000), 'inSede');
    expect(cost.total.max).toBe(Math.round(826.43 + 160 + 16));
  });
});

describe('tasse Università di Pisa 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-05001')!;

  it('tabella dell’art. 1.2.2 per gli studenti regolari', () => {
    expect(contributionFor(rule, 26000, 2900)).toBe(0);
    expect(contributionFor(rule, 26001, 2900)).toBe(280);
    expect(contributionFor(rule, 40000, 2900)).toBe(969);
    expect(contributionFor(rule, 55000, 2900)).toBe(1883);
    expect(contributionFor(rule, 98500, 2900)).toBe(2854);
    expect(contributionFor(rule, 100000, 2900)).toBe(2900);
    expect(contributionFor(rule, null, 2900)).toBe(2900);
  });

  it('riduzione del 15% di (2.900 € − contributo) per chi è fuori sede', () => {
    expect(offSiteContribution(rule, 969)).toBe(679.35);
    expect(offSiteContribution(rule, 0)).toBe(0);
    expect(offSiteContribution(rule, 2900)).toBe(2900);
  });

  it('costo reale: riduzione certa fuori sede, possibile per i pendolari, assente in sede', () => {
    const pisa = getUniversityById('ateneo-05001')!;
    const tasse = (condition: 'fuoriSede' | 'pendolare' | 'inSede') =>
      realCost(pisa, null, exact(40000), exact(20000), condition).lines.find((line) => line.key === 'tasse')!;
    expect(tasse('fuoriSede')).toMatchObject({ min: 679.35, max: 679.35 });
    expect(tasse('pendolare')).toMatchObject({ min: 679.35, max: 969 });
    expect(tasse('inSede')).toMatchObject({ min: 969, max: 969 });
  });
});

describe('tasse Statale di Milano 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-01501')!;
  const courses = getCourses('ateneo-01501');
  const named = (name: string) => courses.find((course) => course.name === name)!;
  const areaA = courseGroup(rule, named('Giurisprudenza'))!;
  const areaB = courseGroup(rule, named('Scienze Sociali per la Globalizzazione'))!;
  const pay = (isee: number | null, group = areaA) => contributionFor(rule, isee, group.max, group.bands);

  it('area A per nome esatto dall’Allegato 1, area B per tutti gli altri corsi', () => {
    expect(areaA.id).toBe('A');
    expect(areaB.id).toBe('B');
    expect(courseGroup(rule, named("Filologia, Letterature e Storia dell'Antichità"))?.id).toBe('A');
    expect(courseGroup(rule, named('Lingue e Letterature Straniere'))?.id).toBe('B');
    expect(courseGroup(rule, null)?.id).toBe('B');
  });

  it('no-tax area fino a 30.000 €, poi 3% e 6,7%; area B × 1,28', () => {
    expect(pay(30000)).toBe(0);
    expect(pay(30000.01)).toBe(150);
    expect(pay(38000)).toBe(390);
    expect(pay(50000)).toBe(1194);
    expect(pay(90000)).toBe(3204);
    expect(pay(50000, areaB)).toBe(1528.32);
    expect(pay(null, areaB)).toBe(4101.12);
    expect(fixedFeesRange(rule, exact(40000)).regionalTax.min).toBe(160);
    expect(fixedFeesRange(rule, none).max).toBe(206);
  });
});

describe('tasse Politecnico di Milano 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-01502')!;

  it('esonero fino a 22.000 €, formule della tabella 4.2 fino a 30.000 €', () => {
    expect(contributionFor(rule, 22000, 3726)).toBe(0);
    expect(contributionFor(rule, 23000, 3726)).toBe(77);
    expect(contributionFor(rule, 25000, 3726)).toBe(304.5);
    expect(contributionFor(rule, 30000, 3726)).toBe(1071);
  });

  it('fasce di reddito delle tabelle 1 e 2, contributo pieno oltre 95.000 €', () => {
    expect(contributionFor(rule, 30500, 3726)).toBe(1474);
    expect(contributionFor(rule, 45000, 3726)).toBe(2109);
    expect(contributionFor(rule, 95000, 3726)).toBe(3189);
    expect(contributionFor(rule, 100000, 3726)).toBe(3726);
    expect(contributionFor(rule, null, 3726)).toBe(3726);
    expect(fixedFeesRange(rule, none).max).toBe(217.04);
  });
});

describe('tasse Sapienza 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-05801')!;
  const courses = getCourses('ateneo-05801');
  const named = (name: string) => courses.find((course) => course.name === name)!;
  const groupI = courseGroup(rule, named('Giurisprudenza'))!;
  const groupII = courseGroup(rule, named('Ingegneria Civile'))!;
  const pay = (isee: number | null, group = groupI) => contributionFor(rule, isee, group.max, group.bands);

  it('gruppi contributivi e importi ordinari dell’art. 38', () => {
    expect(groupI.id).toBe('I');
    expect(groupII.id).toBe('II');
    expect(courseGroup(rule, named('Design'))?.id).toBe('II');
    expect(courseGroup(rule, named("Storia dell'Arte"))?.id).toBe('I');
    expect(maxContribution(rule, named('Giurisprudenza'))).toBe(2821);
    expect(maxContribution(rule, named('Ingegneria Civile'))).toBe(2924);
  });

  it('esonero fino a 24.000 € e riduzioni del D.M. 1014/2021 fino a 28.041,10 €', () => {
    expect(pay(24000)).toBe(0);
    expect(pay(25000)).toBe(168);
    expect(pay(27000)).toBe(490);
    expect(pay(28041.1)).toBe(737.01);
  });

  it('curve di ateneo: retta, parabola ed esponenziale fino all’importo ordinario', () => {
    expect(pay(35000)).toBe(826.72);
    expect(pay(40000)).toBe(891.17);
    expect(pay(50000)).toBe(1107.83);
    expect(pay(60000)).toBe(1500);
    expect(pay(80000)).toBe(2283.63);
    expect(pay(120000)).toBe(2821);
    expect(pay(null)).toBe(2821);
    expect(pay(28041.2, groupII)).toBe(790.96);
    expect(pay(60000, groupII)).toBe(1560.06);
    expect(pay(100000, groupII)).toBe(2924);
  });

  it('costo reale a Roma in sede con ISEE oltre la soglia DiSCo', () => {
    const sapienza = getUniversityById('ateneo-05801')!;
    const cost = realCost(sapienza, named('Giurisprudenza'), exact(35000), exact(20000), 'inSede');
    expect(cost.lines.map((item) => item.key)).toEqual(['tasse', 'quota-fissa']);
    expect(cost.total.max).toBe(Math.round(826.72 + 156));
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
    expect(
      maxContribution(
        rule,
        courses.find((course) => course.name.startsWith('Conservazione e Restauro'))!
      )
    ).toBe(5916);
    expect(
      maxContribution(
        rule,
        courses.find((course) => course.classCode === 'L-18')!
      )
    ).toBe(2040);
  });

  it('magistrali a importo maggiorato dalla tabella ufficiale', () => {
    const courses = getCourses(BOLOGNA);
    const named = (name: string) => courses.find((course) => course.name === name && degreeLevel(course) === 'magistrale')!;
    expect(maxContribution(rule, named('International Management'))).toBe(4080);
    expect(maxContribution(rule, named('Bioinformatics'))).toBe(3825);
    expect(maxContribution(rule, named('Interpretazione'))).toBe(3162);
    expect(maxContribution(rule, named('Science Of Climate'))).toBe(2805);
    expect(maxContribution(rule, named('Informatica'))).toBe(2550);
  });

  // Punti presi dal simulatore ufficiale (studenti.unibo.it/sol/simulatore/2026.htm, matricola con ISEE,
  // totale meno 157,04 € di quota fissa), 17/10/2026: corsi da 2.040 € e da 3.060 €.
  it('coincide con il simulatore ufficiale UniBo', () => {
    const official: [number, number, number][] = [
      [25000, 2040, 0], [30000, 2040, 630], [40000, 2040, 1215], [50000, 2040, 1654.5], [70000, 2040, 2040],
      [50000, 3060, 1654.5], [70000, 3060, 3060]
    ];
    for (const [isee, max, value] of official) expect(contributionFor(rule, isee, max)).toBeCloseTo(value, 1);
    expect(rule.fixedFees.total).toBe(157.04);
  });
});

describe('costo reale annuo', () => {
  const bologna = getUniversityById(BOLOGNA)!;
  const economia = getCourses(BOLOGNA).find(
    (course) => course.classCode === 'L-18' && course.city === 'Bologna'
  )!;

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
    const uer = getUniversityById('ateneo-01301')!;
    const cost = realCost(uer, null, exact(15000), none, 'inSede');
    expect(cost.entity).toBeNull();
    expect(cost.lines[0]).toMatchObject({ key: 'tasse', estimated: true });
    expect(cost.missing.length).toBeGreaterThan(0);
  });
});

describe('esonero dalle tasse per gli idonei, anche senza le regole dell’ateneo', () => {
  it('Siena, fuori sede con ISEE basso: tasse a zero, borsa e servizi gratuiti sottratti', () => {
    const siena = getUniversityById('ateneo-05201')!;
    const cost = realCost(siena, null, exact(15000), none, 'fuoriSede');
    const line = (key: string) => cost.lines.find((item) => item.key === key);
    expect(line('tasse')).toMatchObject({ min: 0, max: 0, estimated: false });
    expect(line('borsa')?.max).toBe(2262);
    expect(line('servizi')?.max).toBe(4910);
  });
});

describe('tasse Roma Tre 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-05807')!;
  const triennale = { name: 'Economia', classCode: 'L-18' };
  const magistrale = { name: 'Economia', classCode: 'LM-77' };

  it('Allegato A, matricole: esonero fino a 23.000 €, art. 22.4 fino a 30.000 €, poi fasce da 1.000 €', () => {
    const bands = courseGroup(rule, triennale)!.bands;
    expect(contributionFor(rule, 23000, 2060, bands)).toBe(0);
    expect(contributionFor(rule, 23500, 2060, bands)).toBe(140); // 296 − 156
    expect(contributionFor(rule, 24500, 2060, bands)).toBe(385); // 522 + 19 − 156
    expect(contributionFor(rule, 30500, 2060, bands)).toBe(740); // 522 + 374 − 156
    expect(contributionFor(rule, 87500, 2060, bands)).toBe(1813); // fascia 75: 522 + 550 + 550 + 347 − 156
    expect(contributionFor(rule, 150000, 2060, bands)).toBe(2060); // fascia 88
    expect(contributionFor(rule, null, 2060, bands)).toBe(2060);
  });

  it('lauree magistrali: tabella propria, massimo 2.090 €', () => {
    const group = courseGroup(rule, magistrale)!;
    expect(group.id).toBe('magistrali');
    expect(maxContribution(rule, magistrale)).toBe(2090);
    expect(contributionFor(rule, 26500, 2090, group.bands)).toBe(682.5); // 522 + 316,50 − 156
    expect(contributionFor(rule, 30500, 2090, group.bands)).toBe(770);
    expect(courseGroup(rule, triennale)!.id).toBe('triennali');
  });
});

describe('tasse Tor Vergata 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-05802')!;
  const tv = getUniversityById('ateneo-05802')!;
  const named = (name: string) => getCourses('ateneo-05802').find((course) => course.name === name)!;
  // Seconda + terza rata dal simulatore ufficiale (matricole 2026/27, tassazione ordinaria), ottobre 2026.
  const CLASS_1: [number, number][] = [
    [26000, 0], [26001, 321], [27000, 346], [28000, 370], [28001, 417], [29000, 445], [30000, 472],
    [30001, 1055], [35000, 1153], [40000, 1252], [50000, 1449], [52000, 1488], [59999, 1646], [60001, 1654],
    [70000, 1852], [79999, 2050], [80001, 2068], [85000, 2168], [89999, 2268], [90000, 2270], [95000, 2270]
  ];
  const CLASS_2: [number, number][] = [
    [26001, 364], [27000, 392], [28001, 472], [30000, 535], [30001, 1224], [35000, 1667], [40000, 2110],
    [45000, 2210], [52000, 2351], [59999, 2511], [60001, 2530], [70000, 2720], [80001, 2910], [89999, 3100]
  ];

  it('classe 1 (Giurisprudenza, Economia…): il modello coincide con il simulatore entro 2 €', () => {
    const group = courseGroup(rule, { name: 'Giurisprudenza', classCode: 'LMG/01' })!;
    expect(group.id).toBe('classe-1');
    for (const [isee, expected] of CLASS_1) {
      expect(Math.abs(contributionFor(rule, isee, group.max, group.bands) - expected)).toBeLessThanOrEqual(2);
    }
    expect(contributionFor(rule, null, group.max, group.bands)).toBe(2270);
  });

  it('classe 2 (Medicina e chirurgia, magistrali sanitarie): massimo 3.100 €', () => {
    const group = courseGroup(rule, { name: 'Medicina e Chirurgia', classCode: 'LM-41' })!;
    expect(group.id).toBe('classe-2');
    expect(courseGroup(rule, { name: 'Scienze Riabilitative delle Professioni Sanitarie', classCode: 'LM/SNT2' })!.id).toBe(
      'classe-2'
    );
    for (const [isee, expected] of CLASS_2) {
      expect(Math.abs(contributionFor(rule, isee, group.max, group.bands) - expected)).toBeLessThanOrEqual(2);
    }
  });

  it('corsi delle classi superiori non inseriti: media dichiarata e dato mancante', () => {
    const cost = realCost(tv, named('Medicina Veterinaria'), exact(40000), none, 'inSede');
    expect(cost.tuitionRule).toBe(false);
    expect(cost.lines[0]).toMatchObject({ key: 'tasse', estimated: true });
    expect(cost.missing.join(' ')).toContain('classe di contribuzione');
    expect(realCost(tv, named('Giurisprudenza'), exact(40000), none, 'inSede').tuitionRule).toBe(true);
  });
});

describe('tasse Università di Salerno 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-06501')!;

  it('no tax area fino a 30.000 €, poi le fasce del § 3.3 (totale meno 16 € di bollo)', () => {
    expect(contributionFor(rule, 30000, 1767)).toBe(0);
    expect(contributionFor(rule, 30000.01, 1767)).toBe(1303); // fascia VI: 1.319 − 16
    expect(contributionFor(rule, 45000, 1767)).toBe(1508); // fascia VIII: 1.524 − 16
    expect(contributionFor(rule, 70000, 1767)).toBe(1631); // fascia X: 1.647 − 16
    expect(contributionFor(rule, null, 1767)).toBe(1767); // senza ISEE: 1.783 − 16
  });

  it('tassa regionale campana per ISEE', () => {
    expect(fixedFeesRange(rule, exact(20000)).min).toBe(146);
    expect(fixedFeesRange(rule, exact(40000)).min).toBe(167);
    expect(fixedFeesRange(rule, exact(60000)).min).toBe(189);
  });
});

describe('tasse Vanvitelli 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-06306')!;
  const courses = getCourses('ateneo-06306');
  const named = (name: string) => courses.find((course) => course.name === name)!;

  it('MAC 1: esonero fino a 22.000 €, poi 7% oltre 22.000 € con le riduzioni del D.M. 1014/2021', () => {
    const { bands, max } = courseGroup(rule, named('Matematica'))!;
    expect(contributionFor(rule, 22000, max, bands)).toBe(0);
    expect(contributionFor(rule, 23000, max, bands)).toBe(14); // 1.000 × 7% × 20%
    expect(contributionFor(rule, 25000, max, bands)).toBe(105); // 3.000 × 7% × 50%
    expect(contributionFor(rule, 30000, max, bands)).toBe(504); // 8.000 × 7% × 90%
  });

  it('MAC 2, matricole «senza merito»: fasce 8-13 per area del dipartimento (totale meno 16 € di bollo)', () => {
    const area = (name: string) => courseGroup(rule, named(name))!;
    expect(area('Medicina e Chirurgia').id).toBe('scientifica-1');
    expect(area('Design per la Moda').id).toBe('scientifica-1');
    expect(area('Farmacia').id).toBe('scientifica-2');
    expect(area('Archeologia e Storia dell\'Arte').id).toBe('umanistica');
    const medicina = area('Medicina e Chirurgia');
    expect(contributionFor(rule, 31000, medicina.max, medicina.bands)).toBe(2017); // fascia 8: 2.033 − 16
    expect(contributionFor(rule, 80000, medicina.max, medicina.bands)).toBe(2718); // fascia 13
    const economia = area('Matematica');
    expect(contributionFor(rule, 40000, economia.max, economia.bands)).toBe(2136); // fascia 10: 2.152 − 16
    const giurisprudenza = courseGroup(rule, { name: 'Giurisprudenza', classCode: 'LMG/01', group: 'Giuridico' })!;
    expect(contributionFor(rule, null, giurisprudenza.max, giurisprudenza.bands)).toBe(2406);
  });
});

describe('tasse Università di Siena 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-05201')!;
  const courses = getCourses('ateneo-05201');
  const named = (name: string) => courses.find((course) => course.name === name)!;

  it('Tab. A, gruppo 1: esonero fino a 22.000 €, poi fasce per tipologia di corso', () => {
    const us = courseGroup(rule, named('Matematica'))!; // L-35 equiparata all'umanistico-sociale
    const ts = courseGroup(rule, named('Ingegneria Gestionale'))!;
    const ue = courseGroup(rule, named('Medicina e Chirurgia'))!;
    expect([us.id, ts.id, ue.id]).toEqual(['umanistico-sociale', 'tecnico-scientifica', 'sanitaria-ue']);
    expect(contributionFor(rule, 22000, us.max, us.bands)).toBe(0);
    expect(contributionFor(rule, 22400, us.max, us.bands)).toBe(122); // 2E
    expect(contributionFor(rule, 24300, ts.max, ts.bands)).toBe(380); // 2J
    expect(contributionFor(rule, 40500, ue.max, ue.bands)).toBe(1800); // 4A
    expect(contributionFor(rule, 99500, ts.max, ts.bands)).toBe(2455); // 9K
    expect(contributionFor(rule, null, ue.max, ue.bands)).toBe(2690); // 9X: senza ISEE
  });

  it('Dentistry ha una tabella propria non inserita: media dichiarata', () => {
    const siena = getUniversityById('ateneo-05201')!;
    const cost = realCost(siena, named('Dentistry And Dental Prosthodontics'), exact(40000), none, 'inSede');
    expect(cost.tuitionRule).toBe(false);
  });
});

describe('tasse Università di Parma 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-03401')!;
  const courses = getCourses('ateneo-03401');
  const group = (name: string) => courseGroup(rule, courses.find((course) => course.name === name)!)!;

  it('formula lineare tra minimo e massimo per area (Allegato 3), esonero fino a 27.000 €', () => {
    const st = group('Ingegneria Gestionale');
    expect(st.id).toBe('scientifico-tecnologica');
    expect(contributionFor(rule, 27000, st.max, st.bands)).toBe(0);
    expect(contributionFor(rule, 28500, st.max, st.bands)).toBe(285); // 570 × 1.500/3.000
    expect(contributionFor(rule, 35000, st.max, st.bands)).toBe(890); // 570 + (1.210 − 570) / 2
    expect(contributionFor(rule, 70000, st.max, st.bands)).toBeCloseTo(2070, 0);
    expect(contributionFor(rule, null, st.max, st.bands)).toBe(2070);
  });

  it('aree: Medicina 2.190 €, Odontoiatria 2.725 €, umanistico-sociale 1.950 €', () => {
    expect(group('Medicina e Chirurgia')).toMatchObject({ id: 'medicina', max: 2190 });
    expect(group('Odontoiatria e Protesi Dentaria')).toMatchObject({ id: 'odontoiatria', max: 2725 });
    expect(group('Servizio Sociale')).toMatchObject({ id: 'umanistico-sociale', max: 1950 });
    const um = group('Giurisprudenza');
    expect(contributionFor(rule, 40000, um.max, um.bands)).toBe(1090);
  });
});

describe('tasse Università di Ferrara 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-03801')!;

  it('matricole: esonero fino a 27.000 €, poi (ISEE − 13.000) × coefficiente, 2.092 € oltre 60.000 €', () => {
    expect(contributionFor(rule, 27000, 2092)).toBe(0);
    expect(contributionFor(rule, 27500, 2092)).toBe(362.5); // 14.500 × 0,025
    expect(contributionFor(rule, 29000, 2092)).toBe(520); // 16.000 × 0,0325
    expect(contributionFor(rule, 40000, 2092)).toBe(1080); // 27.000 × 0,04
    expect(contributionFor(rule, 60000, 2092)).toBe(2091.5); // 47.000 × 0,0445
    expect(contributionFor(rule, null, 2092)).toBe(2092);
  });

  // Totali del simulatore ufficiale (sos.unife.it/app/sim_tax26.php, full-time, primo anno) meno 156 € di
  // prima rata, 17/10/2026.
  it('coincide con il simulatore ufficiale Unife', () => {
    const official: [number, number][] = [[25000, 0], [27500, 362.5], [30000, 552.5], [50000, 1646.5], [60000, 2091.5], [70000, 2092], [150000, 2092]];
    for (const [isee, value] of official) expect(contributionFor(rule, isee, 2092)).toBeCloseTo(value, 1);
    expect(rule.fixedFees.total).toBe(156);
  });
});

describe('tasse Università di Modena e Reggio Emilia 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-03601')!;
  const courses = getCourses('ateneo-03601');
  const group = (name: string, level: string) =>
    courseGroup(rule, courses.find((course) => course.name === name && degreeLevel(course) === level)!)!;

  it('Allegato 1: no tax area fino a 30.000 €, poi aliquote con franchigia 30.000 € e 0 €', () => {
    const triennali = group('Ingegneria del Veicolo', 'triennale');
    expect(triennali.id).toBe('triennali');
    expect(contributionFor(rule, 30000, triennali.max, triennali.bands)).toBe(0);
    expect(contributionFor(rule, 40000, triennali.max, triennali.bands)).toBe(878); // 8,78% × 10.000
    expect(contributionFor(rule, 50000, triennali.max, triennali.bands)).toBe(1470); // 2,94% × 50.000
    expect(contributionFor(rule, null, triennali.max, triennali.bands)).toBe(1815.33); // 1.975 − 159,67 di voci fisse
  });

  it('stesso nome, livelli diversi: Ingegneria del Veicolo magistrale ha aliquote proprie', () => {
    const lm = group('Ingegneria del Veicolo', 'magistrale');
    expect(lm.id).toBe('ingegneria-veicolo');
    expect(contributionFor(rule, 40000, lm.max, lm.bands)).toBe(1146);
    expect(group('Medicina e Chirurgia', 'ciclo-unico').max).toBe(2072.33);
    expect(group('Odontoiatria e Protesi Dentaria', 'ciclo-unico').max).toBe(3297.33);
  });
});

describe('tasse Università di Bari 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-07201')!;

  it('no tax area fino a 26.000 €, tetto del D.M. 1014 fino a 30.000 €, poi le formule della tabella 4.1.2', () => {
    expect(contributionFor(rule, 26000, 2950)).toBe(0);
    expect(contributionFor(rule, 27000, 2950)).toBe(637); // 14.000 × 7% × 65%
    expect(contributionFor(rule, 29000, 2950)).toBe(952); // 16.000 × 7% × 85%
    expect(contributionFor(rule, 40000, 2950)).toBe(1659.74); // (40.000 + 38.941,82)/25.000 × 525,62
    expect(contributionFor(rule, 75000, 2950)).toBe(2256.22); // 2.012,44 + 25.000/50.000 × 487,56
    expect(contributionFor(rule, null, 2950)).toBe(2950);
  });

  it('tassa regionale pugliese per ISEE', () => {
    expect(fixedFeesRange(rule, exact(20000)).min).toBe(162);
    expect(fixedFeesRange(rule, exact(60000)).min).toBe(211);
  });

  it('ADISU Puglia: +15% fino a 13.000 €, −20% oltre 17.333,33 €', () => {
    const adisu = dsuEntityFor('ateneo-07201')!;
    expect(adisu.shortName).toBe('ADISU Puglia');
    expect(amountAt(adisu, 12000, 'fuoriSede')).toBe(8247.8);
    expect(amountAt(adisu, 15000, 'pendolare')).toBe(4191);
    expect(amountAt(adisu, 20000, 'inSede')).toBe(2312.8);
  });
});

describe('Palermo 2026/27: tasse Unipa e borse ERSU', () => {
  const rule = tuitionRuleFor('ateneo-08201')!;
  const courses = getCourses('ateneo-08201');
  const group = (name: string) => courseGroup(rule, courses.find((course) => course.name === name)!)!;

  it('no tax area fino a 25.000 €, poi il minore tra regola di ateneo e tetto del D.M. 1014', () => {
    const um = group('Economia e Finanza');
    expect(um.id).toBe('umanistica');
    expect(contributionFor(rule, 25000, um.max, um.bands)).toBe(0);
    expect(contributionFor(rule, 25400, um.max, um.bands)).toBe(92); // 23% × 400 < 7% × 3.400 × 50%
    expect(contributionFor(rule, 27000, um.max, um.bands)).toBe(262.5); // tetto D.M.: 7% × 5.000 × 75%
    expect(contributionFor(rule, 31000, um.max, um.bands)).toBe(1323); // classe 16
    expect(contributionFor(rule, null, um.max, um.bands)).toBe(2655); // classe 27
  });

  it('aree dell’art. 3: Medicina, professioni sanitarie, scienze motorie, gastronomia', () => {
    expect(group('Medicina e Chirurgia')).toMatchObject({ id: 'medica', max: 3298 });
    expect(group('Scienze delle Attività Motorie e Sportive').id).toBe('umanistica');
    expect(group('Scienze Gastronomiche').id).toBe('scientifica-per-nome');
    expect(group('Statistica per l\'Analisi dei Dati').id).toBe('scientifica');
  });

  it('ERSU Palermo: soglia 23.000 €, +15% sotto 11.500 €, riduzioni a scalini fino alla metà', () => {
    const ersu = dsuEntityFor('ateneo-08201')!;
    expect(ersu.thresholds).toMatchObject({ isee: 23000, ispe: 52500 });
    expect(amountAt(ersu, 10000, 'fuoriSede')).toBe(8246.78);
    expect(amountAt(ersu, 14000, 'pendolare')).toBe(4190.71);
    expect(amountAt(ersu, 17000, 'inSede')).toBe(2312.13); // −20%
    expect(amountAt(ersu, 22000, 'fuoriSede')).toBe(3585.56); // metà
  });
});

describe('Catania 2026/27: tasse Unict e borse ERSU', () => {
  const rule = tuitionRuleFor('ateneo-08701')!;

  it('Tabella 2.A: 7% oltre 22.000 €, poi 560 € + 4,6% e 1.650 € + 2,347%, massimo 2.150 €', () => {
    expect(contributionFor(rule, 22000, 2150)).toBe(0);
    expect(contributionFor(rule, 26000, 2150)).toBe(280);
    expect(contributionFor(rule, 40000, 2150)).toBe(1020);
    expect(contributionFor(rule, 60000, 2150)).toBe(1797.93); // 1.650 + 0,02347 × 6.303
    expect(contributionFor(rule, 80000, 2150)).toBe(2150);
  });

  it('ERSU Catania: soglia 25.000 €, +15% fino a 12.500 €, metà oltre 23.333 €', () => {
    const ersu = dsuEntityFor('ateneo-08701')!;
    expect(ersu.thresholds).toMatchObject({ isee: 25000, ispe: 60000 });
    expect(amountAt(ersu, 12000, 'pendolare')).toBe(4819.32);
    expect(amountAt(ersu, 17000, 'pendolare')).toBe(3771.64); // −10%: 3.171,64 € + 600 € di pasti in Tab. 9.2
    expect(amountAt(ersu, 24000, 'fuoriSede')).toBe(3585.56);
  });
});

describe('tasse Università di Genova 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-01001')!;
  const one = courseGroup(rule, { name: 'Economia Aziendale', classCode: 'L-18' })!;
  const two = courseGroup(rule, { name: 'Ingegneria Meccanica', classCode: 'L-9' })!;

  it('classe contributiva dalla classe di laurea (area ministeriale), anche con spazi nel codice', () => {
    expect(one.id).toBe('classe-1');
    expect(two.id).toBe('classe-2');
    expect(courseGroup(rule, { name: 'Scienze della Formazione Primaria', classCode: 'LM-85 bis' })!.id).toBe('classe-1');
  });

  it('esonero fino a 24.000 €, 7% oltre 24.000 € fino a 30.000 €, poi le rette della tabella', () => {
    expect(contributionFor(rule, 24000, one.max, one.bands)).toBe(0);
    expect(contributionFor(rule, 28000, one.max, one.bands)).toBe(280);
    expect(contributionFor(rule, 30000.01, two.max, two.bands)).toBe(1020);
    expect(contributionFor(rule, 65000, one.max, one.bands)).toBe(2640);
    expect(contributionFor(rule, 100000, two.max, two.bands)).toBe(3300);
    expect(contributionFor(rule, null, one.max, one.bands)).toBe(3025);
  });

  // Seconda + terza rata dal simulatore ufficiale (servizionline.unige.it, primo anno, 17/10/2026), che arrotonda
  // all'euro. Tra 24.000 e 30.000 € il simulatore chiede di più del tetto del 7% dell'art. 6.3.c: lì seguiamo il
  // regolamento e non lo confrontiamo.
  it('coincide con il simulatore ufficiale UniGe fuori dalla fascia 24.000-30.000 €', () => {
    const official: [number, number, number][] = [
      [20000, 0, 0], [30500, 964, 1047], [40000, 1426, 1561], [50000, 1911, 2103], [70000, 2695, 2970], [999999, 3025, 3300]
    ];
    for (const [isee, first, second] of official) {
      expect(Math.abs(contributionFor(rule, isee, one.max, one.bands) - first)).toBeLessThan(1);
      expect(Math.abs(contributionFor(rule, isee, two.max, two.bands) - second)).toBeLessThan(1);
    }
  });

  it('tassa regionale ligure 120/140/160 €', () => {
    expect(fixedFeesRange(rule, exact(15000)).min).toBe(136);
    expect(fixedFeesRange(rule, exact(40000)).min).toBe(176);
  });
});

describe('tasse Politecnico di Bari 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-07202')!;

  it('no tax area fino a 26.000 €, minimo 101 €, poi la formula dell’Appendice', () => {
    expect(contributionFor(rule, 26000, 2257.6)).toBe(0);
    expect(contributionFor(rule, 26500, 2257.6)).toBe(101);
    expect(contributionFor(rule, 29000, 2257.6)).toBe(420); // 14% × 3.000
    expect(contributionFor(rule, 60000, 2257.6)).toBe(1409.56); // 1,017 × 693 / 30.000 × 60.000
    expect(contributionFor(rule, 90000, 2257.6)).toBe(2257.6);
    expect(contributionFor(rule, null, 2257.6)).toBe(2257.6);
  });

  it('tassa regionale ADISU Puglia 146/170/195 €', () => {
    expect(fixedFeesRange(rule, exact(20000)).min).toBe(162);
    expect(fixedFeesRange(rule, exact(60000)).min).toBe(211);
  });
});

describe('tasse Università di Foggia 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-07101')!;

  it('esonero fino a 22.000 €, quote del 7% fino a 30.000 €, poi 1.190 € + aliquote', () => {
    expect(contributionFor(rule, 22000, 1715)).toBe(0);
    expect(contributionFor(rule, 25000, 1715)).toBe(105); // 50% del 7% di 3.000
    expect(contributionFor(rule, 30000, 1715)).toBe(504); // 90% del 7% di 8.000
    expect(contributionFor(rule, 45000, 1715)).toBe(1352.5);
    expect(contributionFor(rule, 80000, 1715)).toBe(1715);
    expect(contributionFor(rule, null, 1715)).toBe(1715);
  });
});

describe('tasse Università del Salento 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-07501')!;

  it('quota reddito dell’Allegato A con le riduzioni d’ateneo, gradini da 40 € e tetto di 3.000 €', () => {
    expect(contributionFor(rule, 25000, 3000)).toBe(0);
    expect(contributionFor(rule, 27000, 3000)).toBe(661.11); // 75% di 14.000/27.000 × 1.700
    expect(contributionFor(rule, 40000, 3000)).toBe(1615); // 95% di 1.700
    expect(contributionFor(rule, 52000, 3000)).toBe(1780);
    expect(contributionFor(rule, 70000, 3000)).toBe(2352); // (70.000 − 14.000) × 0,042
    expect(contributionFor(rule, 90000, 3000)).toBe(3000);
    expect(contributionFor(rule, null, 3000)).toBe(3000);
  });
});

describe('tasse L’Orientale 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-06303')!;

  it('esonero fino a 24.000 €, percentuali dell’ISEE oltre 13.000 €, poi 1.071 € + 1,15% fino a 1.300 €', () => {
    expect(contributionFor(rule, 24000, 1300)).toBe(0);
    expect(contributionFor(rule, 25000, 1300)).toBe(420);
    expect(contributionFor(rule, 30000, 1300)).toBe(1071);
    expect(contributionFor(rule, 40000, 1300)).toBe(1186);
    expect(contributionFor(rule, 60000, 1300)).toBe(1300);
    expect(contributionFor(rule, null, 1300)).toBe(1300);
  });
});

describe('tasse Università di Cassino 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-06001')!;

  it('esonero fino a 22.000 €, importi della Tabella I per fasce di 1.000 €, massimo 2.500 €', () => {
    expect(contributionFor(rule, 22000, 2500)).toBe(0);
    expect(contributionFor(rule, 22000.01, 2500)).toBe(140);
    expect(contributionFor(rule, 29500, 2500)).toBe(1071);
    expect(contributionFor(rule, 40000, 2500)).toBe(1786);
    expect(contributionFor(rule, 60000, 2500)).toBe(2500);
    expect(contributionFor(rule, null, 2500)).toBe(2500);
    expect(fixedFeesRange(rule, exact(15000)).min).toBe(156);
  });
});

describe('tasse Università del Sannio 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-06201')!;
  const tri = courseGroup(rule, { name: 'Economia Aziendale', classCode: 'L-18' })!;
  const mag = courseGroup(rule, { name: 'Ingegneria Informatica', classCode: 'LM-32' })!;

  it('no tax area fino a 30.000 €, poi fasce di 5.000 €; magistrali 50 € in più', () => {
    expect(tri.id).toBe('triennali');
    expect(mag.id).toBe('magistrali');
    expect(contributionFor(rule, 30000, tri.max, tri.bands)).toBe(0);
    expect(contributionFor(rule, 32000, tri.max, tri.bands)).toBe(1400);
    expect(contributionFor(rule, 32000, mag.max, mag.bands)).toBe(1450);
    expect(contributionFor(rule, 70000, tri.max, tri.bands)).toBe(1750);
    expect(contributionFor(rule, null, mag.max, mag.bands)).toBe(1800);
  });

  // Tabelle del simulatore ufficiale (unisannio.it/public/simulatore, assets/simulator.js, regime ordinario
  // entro il 1° fuori corso, tassa regionale ADISURC), 17/10/2026.
  it('coincide con il simulatore ufficiale del Sannio', () => {
    const limits = [35000, 40000, 45000, 50000, 55000, 60000, 65000, 90000];
    const L = [1400, 1450, 1500, 1550, 1600, 1650, 1700, 1750];
    const LM = [1450, 1500, 1550, 1600, 1650, 1700, 1750, 1800];
    limits.forEach((isee, i) => {
      expect(contributionFor(rule, isee, tri.max, tri.bands)).toBe(L[i]);
      expect(contributionFor(rule, isee, mag.max, mag.bands)).toBe(LM[i]);
    });
    expect(fixedFeesRange(rule, { min: 25500, max: 51000 }).regionalTax).toEqual({ min: 130, max: 151 });
    expect(fixedFeesRange(rule, { min: 51001, max: 51001 }).regionalTax.max).toBe(173);
  });
});

describe('tasse Università della Tuscia 2026/27', () => {
  const rule = tuitionRuleFor('ateneo-05601')!;

  it('no tax area fino a 26.000 €, poi interpolazione lineare della Tabella 3 (esempi del par. 7.4)', () => {
    expect(contributionFor(rule, 26000, 2394)).toBe(0);
    expect(contributionFor(rule, 27000, 2394)).toBe(267.75);
    expect(contributionFor(rule, 30000, 2394)).toBe(1071);
    expect(contributionFor(rule, 37000, 2394)).toBe(1530);
    expect(contributionFor(rule, 55000, 2394)).toBe(2135);
    expect(contributionFor(rule, 150000, 2394)).toBe(2394);
    expect(contributionFor(rule, null, 2394)).toBe(2394);
  });
});

describe('borse ALiSEO 2026/27 (Genova)', () => {
  const aliseo = dsuEntityFor('ateneo-01001')!;

  it('soglie 28.339 € / 61.608 €, Tabella 8 con +15% fino a 14.169,50 €', () => {
    expect(aliseo.id).toBe('aliseo');
    expect(aliseo.thresholds).toMatchObject({ isee: 28339, ispe: 61608 });
    expect(amountAt(aliseo, 10000, 'fuoriSede')).toBe(8247.8);
    expect(amountAt(aliseo, 16000, 'pendolare')).toBe(4191);
    expect(amountAt(aliseo, 25000, 'inSede')).toBe(1446);
  });
});

describe('Bergamo 2026/27: tasse UniBG e borse DSU', () => {
  const rule = tuitionRuleFor('ateneo-01601')!;
  const lettere = courseGroup(rule, { name: 'Lettere', classCode: 'L-10', group: 'Letterario' })!;
  const ing = courseGroup(rule, { name: 'Ingegneria Informatica', classCode: 'L-8', group: 'Ingegneria industriale e dell\'informazione' })!;
  const psi = courseGroup(rule, { name: 'Scienze Psicologiche', classCode: 'L-24', group: 'Psicologico' })!;

  it('aree didattiche: 1 predefinita, 2 per nome, 3 per macroarea', () => {
    expect([lettere.id, psi.id, ing.id]).toEqual(['area-1', 'area-2', 'area-3']);
  });

  it('no tax area fino a 28.000 €, 8,5% oltre 26.000 € fino a 30.000 €, poi scaglioni (esempi della guida)', () => {
    expect(contributionFor(rule, 28000, lettere.max, lettere.bands)).toBe(0);
    expect(contributionFor(rule, 29000, lettere.max, lettere.bands)).toBe(255);
    expect(contributionFor(rule, 32500, lettere.max, lettere.bands)).toBe(669.2);
    expect(contributionFor(rule, 40500, ing.max, ing.bands)).toBe(1123.2);
    expect(contributionFor(rule, 65000, psi.max, psi.bands)).toBe(1883);
    expect(contributionFor(rule, null, ing.max, ing.bands)).toBe(2083);
  });

  it('borse con gli importi regionali lombardi e voto minimo di maturità', () => {
    const dsu = dsuEntityFor('ateneo-01601')!;
    expect(dsu.thresholds).toMatchObject({ isee: 26887.93, ispe: 58452.06 });
    expect(amountAt(dsu, 15000, 'fuoriSede')).toBe(6343);
    expect(dsu.accessRequirement?.text).toContain('70/100');
  });
});

describe('Brescia 2026/27: tasse UniBS e borse DSU', () => {
  const rule = tuitionRuleFor('ateneo-01701')!;
  const group = (name: string, classCode: string, macro: string) => courseGroup(rule, { name, classCode, group: macro })!;
  const ingTri = group('Ingegneria Informatica', 'L-8', 'Ingegneria industriale e dell\'informazione');
  const ingMag = group('Ingegneria Informatica', 'LM-32', 'Ingegneria industriale e dell\'informazione');
  const eco = group('Economia e Gestione Aziendale', 'L-18', 'Economico');
  const inf = group('Infermieristica (Abilitante alla Professione Sanitaria di Infermiere)', 'L/SNT1', 'Medico-Sanitario e Farmaceutico');
  const med = group('Medicina e Chirurgia', 'LM-41', 'Medico-Sanitario e Farmaceutico');

  it('tabelle per area e livello: macroarea più livello, nomi e classi delle professioni sanitarie', () => {
    expect([ingTri.id, ingMag.id, eco.id, inf.id, med.id]).toEqual([
      'ingegneria-triennali', 'ingegneria-magistrali', 'economia-giurisprudenza-triennali', 'infermieristica', 'medicina'
    ]);
    expect(group('Fisioterapia (Abilitante alla Professione Sanitaria di Fisioterapista)', 'L/SNT2', 'Medico-Sanitario e Farmaceutico').id).toBe('professioni-sanitarie');
  });

  it('valori uguali al simulatore ufficiale (somma di seconda e terza rata)', () => {
    expect(contributionFor(rule, 28000, eco.max, eco.bands)).toBe(0);
    expect(contributionFor(rule, 28500, eco.max, eco.bands)).toBe(500);
    expect(contributionFor(rule, 29500, eco.max, eco.bands)).toBe(800);
    expect(contributionFor(rule, 45000, eco.max, eco.bands)).toBe(1660);
    expect(contributionFor(rule, 60000, ingTri.max, ingTri.bands)).toBe(2210);
    expect(contributionFor(rule, 40000, med.max, med.bands)).toBe(1804);
    expect(contributionFor(rule, null, ingMag.max, ingMag.bands)).toBe(2950);
    expect(contributionFor(rule, null, inf.max, inf.bands)).toBe(1560);
  });

  it('borse con gli importi regionali lombardi e voto minimo di maturità', () => {
    const dsu = dsuEntityFor('ateneo-01701')!;
    expect(dsu.thresholds).toMatchObject({ isee: 26887.93, ispe: 58452.06 });
    expect(amountAt(dsu, 20000, 'pendolare')).toBe(2470);
  });
});

describe('Insubria 2026/27: tasse e borse DSU', () => {
  const rule = tuitionRuleFor('ateneo-01202')!;
  const area = (name: string, classCode: string) => courseGroup(rule, { name, classCode })!;
  const med = area('Medicina e Chirurgia', 'LM-41');
  const inf = area('Informatica', 'L-31');
  const eco = area('Giurisprudenza', 'LMG/01');

  it('aree A, B e C dell’elenco del regolamento', () => {
    expect([med.id, inf.id, eco.id]).toEqual(['area-a', 'area-b', 'area-c']);
    expect(area('Fisioterapia (Abilitante alla Professione Sanitaria di Fisioterapista)', 'L/SNT2').id).toBe('area-b');
  });

  it('no tax area fino a 28.000 €, 48% fino a 30.000 €, poi 15% e 6% fino al massimo dell’area', () => {
    expect(contributionFor(rule, 28000, eco.max, eco.bands)).toBe(0);
    expect(contributionFor(rule, 29000, eco.max, eco.bands)).toBe(480);
    expect(contributionFor(rule, 34000, eco.max, eco.bands)).toBe(1560);
    expect(contributionFor(rule, 40000, med.max, med.bands)).toBe(2280);
    expect(contributionFor(rule, 70000, inf.max, inf.bands)).toBe(3660);
    expect(contributionFor(rule, null, med.max, med.bands)).toBe(3840);
  });

  it('borse con gli importi regionali lombardi', () => {
    const dsu = dsuEntityFor('ateneo-01202')!;
    expect(dsu.thresholds).toMatchObject({ isee: 26887.93, ispe: 58452.06 });
    expect(amountAt(dsu, 10000, 'fuoriSede')).toBe(7419);
  });
});

describe('Pavia 2026/27: tasse UniPV e borse EDiSU', () => {
  const rule = tuitionRuleFor('ateneo-01801')!;
  const area = (name: string, classCode: string, group: string) => courseGroup(rule, { name, classCode, group })!;
  const eco = area('Economia', 'L-33', 'Economico');
  const ing = area('Ingegneria Industriale', 'L-9', 'Ingegneria industriale e dell\'informazione');
  const med = area('Medicina e Chirurgia', 'LM-41', 'Medico-Sanitario e Farmaceutico');

  it('aree dell’Allegato 1: macroarea, nome e classi delle professioni sanitarie', () => {
    expect([eco.id, ing.id, med.id]).toEqual(['area-1', 'area-2', 'area-3']);
    expect(area('Conservazione e Restauro dei Beni Culturali (Abilitante Ai Sensi del D.Lgs N.42/2004)', 'LMR/02', 'Letterario-Umanistico').id).toBe('area-2');
    expect(area('Fisioterapia (Abilitante alla Professione Sanitaria di Fisioterapista)', 'L/SNT2', 'Medico-Sanitario e Farmaceutico').id).toBe('area-2');
  });

  it('esonero fino a 32.000 €, poi gli importi dell’Allegato 2 per fasce di 1.000 €', () => {
    expect(contributionFor(rule, 32000, eco.max, eco.bands)).toBe(0);
    expect(contributionFor(rule, 32500, eco.max, eco.bands)).toBe(74);
    expect(contributionFor(rule, 45500, ing.max, ing.bands)).toBe(1238);
    expect(contributionFor(rule, 60000, med.max, med.bands)).toBe(2772);
    expect(contributionFor(rule, null, med.max, med.bands)).toBe(4851);
    expect(contributionFor(rule, 90000, eco.max, eco.bands)).toBe(3636);
  });

  it('borse EDiSU con gli elenchi dei comuni di Pavia e Cremona', () => {
    const edisu = dsuEntityFor('ateneo-01801')!;
    const check = (seat: string, city: string) => conditionFromMunicipality(edisu, seat, city, true)?.condition;
    expect(edisu.thresholds).toMatchObject({ isee: 26887.93, ispe: 58452.06 });
    expect(amountAt(edisu, 15000, 'inSede')).toBe(2162);
    expect(check('Pavia', 'Voghera')).toBe('inSede');
    expect(check('Pavia', 'Binasco')).toBe('pendolare');
    expect(check('Pavia', 'Cernusco sul Naviglio')).toBe('pendolare');
    expect(check('Cremona', 'Castelvetro Piacentino')).toBe('inSede');
    expect(check('Pavia', 'Bergamo')).toBe('fuoriSede');
  });
});

describe('Verona 2026/27: tasse UniVR e borse regionali venete', () => {
  const rule = tuitionRuleFor('ateneo-02301')!;
  const group = (name: string, classCode: string, macro: string) => courseGroup(rule, { name, classCode, group: macro })!;
  const eco = group('Economia Aziendale', 'L-18', 'Economico');
  const ecoMag = group('Economia e Legislazione d\'Impresa', 'LM-77', 'Economico');
  const odo = group('Odontoiatria e Protesi Dentaria', 'LM-46', 'Medico-Sanitario e Farmaceutico');
  const inf = group('Informatica', 'L-31', 'Informatica e Tecnologie ICT');
  const san = group('Infermieristica (Abilitante alla Professione Sanitaria di Infermiere)', 'L/SNT1', 'Medico-Sanitario e Farmaceutico');

  it('gruppi A1, A2, A3, B e C', () => {
    expect([odo.id, inf.id, san.id, ecoMag.id, eco.id]).toEqual(['a1', 'a2', 'a3', 'b', 'c']);
  });

  it('esonero fino a 27.000 €, 7% ridotto fino a 30.000 € (esempio del regolamento), poi lineare fino a 55.000 €', () => {
    expect(contributionFor(rule, 27000, eco.max, eco.bands)).toBe(0);
    expect(contributionFor(rule, 27000.01, eco.max, eco.bands)).toBe(735);
    expect(contributionFor(rule, 30000, eco.max, eco.bands)).toBe(1071);
    expect(contributionFor(rule, 55000, inf.max, inf.bands)).toBe(2021);
    expect(contributionFor(rule, null, odo.max, odo.bands)).toBe(3212);
  });

  it('borse con gli importi regionali veneti, come a Padova', () => {
    const dsu = dsuEntityFor('ateneo-02301')!;
    expect(dsu.thresholds).toMatchObject({ isee: 26306.25, ispe: 43125.94 });
    expect(amountAt(dsu, 10000, 'fuoriSede')).toBe(8246);
  });
});

describe('Ca’ Foscari 2026/27: tasse dal simulatore ufficiale e borse regionali', () => {
  const rule = tuitionRuleFor('ateneo-02701')!;
  const tri = courseGroup(rule, { name: 'Economia e Commercio', classCode: 'L-18' })!;
  const mag = courseGroup(rule, { name: 'Economia e Finanza', classCode: 'LM-16' })!;

  it('esonero fino a 25.000 €, poi i tratti del simulatore (420-1.020 € fino a 30.000 €)', () => {
    expect(contributionFor(rule, 25000, tri.max, tri.bands)).toBe(0);
    expect(contributionFor(rule, 25500, tri.max, tri.bands)).toBe(438);
    expect(contributionFor(rule, 30000, tri.max, tri.bands)).toBe(1020);
    expect(Math.round(contributionFor(rule, 45000, tri.max, tri.bands))).toBe(1714);
    expect(Math.round(contributionFor(rule, 45000, mag.max, mag.bands))).toBe(1944);
    expect(contributionFor(rule, null, mag.max, mag.bands)).toBe(2428);
    expect(isExcludedCourse(rule, { name: 'Digital Management', classCode: 'L-18' })).toBe(true);
  });

  it('borse con gli importi regionali veneti', () => {
    expect(dsuEntityFor('ateneo-02701')!.thresholds.isee).toBe(26306.25);
  });
});

describe('borse Opera Universitaria di Trento 2026/27', () => {
  const opera = dsuEntityFor('ateneo-02201')!;
  const check = (seat: string, city: string, rents = true) => conditionFromMunicipality(opera, seat, city, rents)?.condition;

  it('soglie 26.000 € / 52.000 €, +15% fino a 13.000 €, poi calo fino alla metà', () => {
    expect(opera.thresholds).toMatchObject({ isee: 26000, ispe: 52000 });
    expect(amountAt(opera, 12000, 'fuoriSede')).toBe(8246.79);
    expect(amountAt(opera, 15000, 'pendolare')).toBe(4190.72);
    expect(amountAt(opera, 26000, 'inSede')).toBe(1445.08);
  });

  it('Tabelle 3 e 4: comuni di Trento e Rovereto, anche in provincia di Bolzano', () => {
    expect(check('Trento', 'Lavis')).toBe('inSede');
    expect(check('Trento', 'Rovereto')).toBe('pendolare');
    expect(check('Trento', 'Termeno sulla Strada del Vino')).toBe('pendolare');
    expect(check('Rovereto', 'Mori')).toBe('inSede');
    expect(check('Rovereto', 'Trento')).toBe('pendolare');
    expect(check('Trento', 'Verona')).toBe('fuoriSede');
  });
});

describe('Friuli Venezia Giulia 2026/27: tasse di Trieste e Udine, borse ARDiS', () => {
  it('Trieste: esonero fino a 30.000 €, poi 400 € + 5,56% fino a 2.900 €', () => {
    const rule = tuitionRuleFor('ateneo-03201')!;
    expect(contributionFor(rule, 30000, 2900)).toBe(0);
    expect(contributionFor(rule, 40000, 2900)).toBe(956);
    expect(contributionFor(rule, 75000, 2900)).toBe(2900);
    expect(contributionFor(rule, null, 2900)).toBe(2900);
    expect(fixedFeesRange(rule, exact(20000)).min).toBe(136);
  });

  it('Udine: esonero fino a 30.000 €, poi gli importi della Tabella 1', () => {
    const rule = tuitionRuleFor('ateneo-03001')!;
    expect(contributionFor(rule, 30000, 1900)).toBe(0);
    expect(contributionFor(rule, 30500, 1900)).toBe(800);
    expect(contributionFor(rule, 45500, 1900)).toBe(1400);
    expect(contributionFor(rule, 52000, 1900)).toBe(1625);
    expect(contributionFor(rule, 70000, 1900)).toBe(1900);
  });

  it('ARDiS: soglie nazionali, elenchi dei comuni per sede', () => {
    const ardis = dsuEntityFor('ateneo-03001')!;
    expect(dsuEntityFor('ateneo-03201')!.id).toBe('ardis-fvg');
    expect(ardis.thresholds).toMatchObject({ isee: 28339.88, ispe: 61608.48 });
    expect(amountAt(ardis, 16000, 'fuoriSede')).toBe(7171.11);
    const check = (seat: string, city: string) => conditionFromMunicipality(ardis, seat, city, true)?.condition;
    expect(check('Udine', 'Tavagnacco')).toBe('inSede');
    expect(check('Udine', 'Cervignano')).toBe('pendolare');
    expect(check('Trieste', 'Duino Aurisina')).toBe('inSede');
    expect(check('Pordenone', 'Valvasone Arzene')).toBe('pendolare');
    expect(check('Gemona Del Friuli', 'Venzone')).toBe('inSede');
    expect(check('Trieste', 'Udine')).toBe('fuoriSede');
  });
});

describe('Umbria 2026/27: tasse UniPG e borse ADiSU', () => {
  it('UniPG: no tax area fino a 22.000 €, low tax area a fasce, poi Allegato 2', () => {
    const rule = tuitionRuleFor('ateneo-05401')!;
    expect(contributionFor(rule, 22000, 1940)).toBe(0);
    expect(contributionFor(rule, 25000, 1940)).toBe(385);
    expect(contributionFor(rule, 32000, 1940)).toBe(1130);
    expect(contributionFor(rule, 120000, 1940)).toBe(1940);
    expect(fixedFeesRange(rule, exact(15000)).min).toBe(156);
  });

  it('ADiSU: importi a scalini con la mensa, elenchi dei comuni per sede', () => {
    const adisu = dsuEntityFor('ateneo-05401')!;
    expect(dsuEntityFor('ateneo-05403')!.id).toBe('adisu-umbria');
    expect(adisu.thresholds).toMatchObject({ isee: 28339.88, ispe: 61608.48 });
    expect(amountAt(adisu, 20000, 'fuoriSede')).toBe(5499.78);
    expect(amountAt(adisu, 25000, 'inSede')).toBe(1995.08);
    const check = (seat: string, city: string) => conditionFromMunicipality(adisu, seat, city, true)?.condition;
    expect(check('Perugia', 'Corciano')).toBe('inSede');
    expect(check('Perugia', 'Bastia Umbra')).toBe('pendolare');
    expect(check('Terni', 'Narni')).toBe('inSede');
    expect(check('Perugia', 'Todi')).toBe('fuoriSede');
  });
});

describe('Marche 2026/27: tasse UNIVPM, Macerata e Urbino, borse ERDIS', () => {
  it('UNIVPM: esonero fino a 28.000 €, poi formula per fasce con il coefficiente del corso', () => {
    const rule = tuitionRuleFor('ateneo-04201')!;
    expect(contributionFor(rule, 28000, 2035)).toBe(0);
    expect(contributionFor(rule, 29000, 2035)).toBe(753.75);
    expect(contributionFor(rule, 90000, 2035)).toBe(2035);
    expect(fixedFeesRange(rule, exact(15000)).min).toBe(156);
  });

  it('Macerata: esonero fino a 26.000 €, poi formula fino a 32.000 € e importi fissi', () => {
    const rule = tuitionRuleFor('ateneo-04301')!;
    expect(contributionFor(rule, 26000, 1574)).toBe(0);
    expect(contributionFor(rule, 29000, 1574)).toBe(785.89);
    expect(contributionFor(rule, 35000, 1574)).toBe(1410);
    expect(contributionFor(rule, null, 1574)).toBe(1574);
  });

  it('Urbino: esonero fino a 30.000 €, poi m × ISEE + q senza tassa regionale e bollo', () => {
    const rule = tuitionRuleFor('ateneo-04101')!;
    expect(contributionFor(rule, 30000, 1706)).toBe(0);
    expect(contributionFor(rule, 35000, 1706)).toBe(1412.81);
    expect(contributionFor(rule, 90000, 1706)).toBe(1706);
  });

  it('ERDIS: soglia ISEE 24.000 €, importi a scalini, comuni pendolari per sede', () => {
    const erdis = dsuEntityFor('ateneo-04301')!;
    expect(dsuEntityFor('ateneo-04201')!.id).toBe('erdis-marche');
    expect(dsuEntityFor('ateneo-04101')!.id).toBe('erdis-marche');
    expect(erdis.thresholds).toMatchObject({ isee: 24000, ispe: 50000 });
    expect(amountAt(erdis, 17000, 'fuoriSede')).toBe(6274.72);
    expect(amountAt(erdis, 23000, 'pendolare')).toBe(2095.36);
    const check = (seat: string, city: string) => conditionFromMunicipality(erdis, seat, city, true)?.condition;
    expect(check('Macerata', 'Macerata')).toBe('inSede');
    expect(check('Macerata', 'Tolentino')).toBe('pendolare');
    expect(check('Ancona', 'Osimo')).toBe('pendolare');
    expect(check('Fermo', 'Cupra Marittima')).toBe('pendolare');
    expect(check('Urbino', 'Roma')).toBe('fuoriSede');
  });
});

describe('Abruzzo 2026/27: borse ADSU Chieti-Pescara', () => {
  it('soglie regionali, tre fasce a scalini con la mensa, elenchi dei comuni', () => {
    const adsu = dsuEntityFor('ateneo-06901')!;
    expect(adsu.id).toBe('adsu-chieti-pescara');
    expect(adsu.thresholds).toMatchObject({ isee: 24335.11, ispe: 52902.43 });
    expect(amountAt(adsu, 10000, 'fuoriSede')).toBe(7679.32);
    expect(amountAt(adsu, 15000, 'fuoriSede')).toBe(7171.11);
    expect(amountAt(adsu, 22000, 'inSede')).toBe(2462.91);
    const check = (seat: string, city: string) => conditionFromMunicipality(adsu, seat, city, true)?.condition;
    expect(check('Chieti', 'Pescara')).toBe('inSede');
    expect(check('Chieti', 'Lanciano')).toBe('pendolare');
    expect(check('Pescara', 'Mosciano Sant’Angelo')).toBe('pendolare');
    expect(check('Vasto', 'San Salvo')).toBe('inSede');
    // La città dell'ateneo nel dataset è «Chieti Scalo» (frazione di Chieti): stesso elenco.
    expect(check('Chieti Scalo', 'Pescara')).toBe('inSede');
    expect(check('Pescara', 'Roma')).toBe('fuoriSede');
  });
});

describe('Abruzzo 2026/27: tasse UnivAQ e borse ADSU L’Aquila', () => {
  it('UnivAQ: esonero sotto 24.000 €, poi schema a fasce fino a 1.600 €', () => {
    const rule = tuitionRuleFor('ateneo-06601')!;
    expect(contributionFor(rule, 23000, 1600)).toBe(0);
    expect(contributionFor(rule, 30000, 1600)).toBe(680);
    expect(contributionFor(rule, 40000, 1600)).toBe(1240);
    expect(contributionFor(rule, 60000, 1600)).toBe(1600);
    expect(contributionFor(rule, null, 1600)).toBe(1600);
  });

  it('ADSU L’Aquila: stesse fasce regionali, stato per distanza', () => {
    const adsu = dsuEntityFor('ateneo-06601')!;
    expect(adsu.id).toBe('adsu-laquila');
    expect(adsu.thresholds).toMatchObject({ isee: 24335.11, ispe: 52902.43 });
    expect(amountAt(adsu, 15000, 'fuoriSede')).toBe(7171.11);
    expect(amountAt(adsu, 18000, 'pendolare')).toBe(3397.49);
    expect(conditionFromMunicipality(adsu, 'L’Aquila', 'Avezzano', true)).toBeNull();
  });
});

describe('Sicilia 2026/27: borse ERSU Messina', () => {
  it('soglie 22.500/53.000 €, sette fasce a scalini, comuni per sede', () => {
    const ersu = dsuEntityFor('ateneo-08301')!;
    expect(ersu.id).toBe('ersu-messina');
    expect(ersu.thresholds).toMatchObject({ isee: 22500, ispe: 53000 });
    expect(amountAt(ersu, 10000, 'fuoriSede')).toBe(8246.78);
    expect(amountAt(ersu, 16000, 'pendolare')).toBe(3771.64);
    expect(amountAt(ersu, 22000, 'inSede')).toBe(1445.08);
    const check = (seat: string, city: string) => conditionFromMunicipality(ersu, seat, city, true)?.condition;
    expect(check('Messina', 'Messina')).toBe('inSede');
    expect(check('Messina', 'Milazzo')).toBe('pendolare');
    expect(check('Priolo Gargallo', 'Siracusa')).toBe('pendolare');
    expect(check('Messina', 'Catania')).toBe('fuoriSede');
  });
});

describe('Calabria 2026/27: borse della Mediterranea e dell’Unical', () => {
  it('Mediterranea: soglie nazionali, calo lineare fino alla metà (esempio del bando)', () => {
    const dsu = dsuEntityFor('ateneo-08001')!;
    expect(dsu.id).toBe('unirc-dsu');
    expect(dsu.thresholds).toMatchObject({ isee: 28339.88, ispe: 61608.48 });
    expect(amountAt(dsu, 10000, 'fuoriSede')).toBe(8246.78);
    // Il bando arrotonda la percentuale (27,03%): pochi centesimi di scarto.
    expect(amountAt(dsu, 24000, 'fuoriSede')).toBeCloseTo(5232.76, 0);
    expect(amountAt(dsu, 28339.88, 'inSede')).toBe(1445.08);
  });

  it('Unical: soglie 26.500/57.500 €, valori nominali con i servizi, comuni pendolari per Rende', () => {
    const dsu = dsuEntityFor('ateneo-07801')!;
    expect(dsu.id).toBe('unical-dsu');
    expect(dsu.thresholds).toMatchObject({ isee: 26500, ispe: 57500 });
    expect(amountAt(dsu, 12000, 'fuoriSede')).toBe(8246.78);
    expect(amountAt(dsu, 26500, 'fuoriSede')).toBe(5759.56);
    const check = (city: string) => conditionFromMunicipality(dsu, 'Rende', city, true)?.condition;
    expect(check('Rende')).toBe('inSede');
    expect(check('Cosenza')).toBe('pendolare');
    expect(check('San Fili')).toBe('pendolare');
    expect(check('Catanzaro')).toBe('fuoriSede');
  });
});

describe('Sardegna 2026/27: tasse dell’Università di Cagliari', () => {
  it('esonero fino a 24.335,11 €, contributo calmierato, poi tabella e formula per facoltà', () => {
    const rule = tuitionRuleFor('ateneo-09201')!;
    expect(contributionFor(rule, 24335.11, 3418.7)).toBe(0);
    expect(contributionFor(rule, 25000, 3418.7)).toBe(420);
    expect(contributionFor(rule, 27000, 3418.7)).toBe(735);
    expect(contributionFor(rule, 28300, 3418.7)).toBe(774.95);
    expect(contributionFor(rule, 40000, 3418.7)).toBeCloseTo(1067.86, 0);
    expect(contributionFor(rule, null, 3418.7)).toBe(3418.7);
    const medicina = rule.courseGroups!.find((group) => group.id === 'medicina')!;
    expect(contributionFor({ ...rule, bands: medicina.bands }, 27900, 3498.8)).toBe(782.25);
  });
});

describe('Basilicata 2026/27: tasse Unibas', () => {
  it('esonero fino a 22.000 €, 380 € + 3% fino a 30.000 €, poi fasce fisse fino a 2.100 €', () => {
    const rule = tuitionRuleFor('ateneo-07601')!;
    expect(contributionFor(rule, 22000, 2100)).toBe(0);
    expect(contributionFor(rule, 26000, 2100)).toBe(500);
    expect(contributionFor(rule, 30000, 2100)).toBe(620);
    expect(contributionFor(rule, 40000, 2100)).toBe(1250);
    expect(contributionFor(rule, null, 2100)).toBe(2100);
    expect(fixedFeesRange(rule, exact(15000)).min).toBe(156);
  });
});

describe('Sicilia 2026/27: elenchi dei comuni di ERSU Palermo e Catania', () => {
  it('Palermo: tab. 8.1-8.2 per sette sedi', () => {
    const ersu = dsuEntityFor('ateneo-08201')!;
    const check = (seat: string, city: string) => conditionFromMunicipality(ersu, seat, city, true)?.condition;
    expect(check('Palermo', 'Bagheria')).toBe('inSede');
    expect(check('Palermo', 'Santa Flavia')).toBe('inSede');
    expect(check('Palermo', 'Partinico')).toBe('pendolare');
    expect(check('Trapani', 'Castellamare del Golfo')).toBe('pendolare');
    expect(check('Agrigento', 'Favara')).toBe('inSede');
    expect(check('Palermo', 'Messina')).toBe('fuoriSede');
  });

  it('Catania: tab. 11 per la sede di Catania', () => {
    const ersu = dsuEntityFor('ateneo-08701')!;
    const check = (city: string) => conditionFromMunicipality(ersu, 'Catania', city, true)?.condition;
    expect(check('Misterbianco')).toBe('inSede');
    expect(check('Acireale')).toBe('pendolare');
    expect(check('Zafferana')).toBe('pendolare');
    expect(check('Palermo')).toBe('fuoriSede');
  });
});

describe('Puglia 2026/27: elenchi dei comuni ADISU (Allegato A)', () => {
  it('in sede solo nel comune della sede, pendolari dall’elenco, il resto fuori sede', () => {
    const adisu = dsuEntityFor('ateneo-07201')!;
    expect(adisu.id).toBe('adisu-puglia');
    const check = (seat: string, city: string) => conditionFromMunicipality(adisu, seat, city, true)?.condition;
    expect(check('Bari', 'Bari')).toBe('inSede');
    expect(check('Bari', 'Molfetta')).toBe('pendolare');
    expect(check('Lecce', 'Nardò')).toBe('pendolare');
    expect(check('Taranto', 'Martina Franca')).toBe('pendolare');
    expect(check('Foggia', 'Bari')).toBe('fuoriSede');
  });
});

describe('Private 2026/27: Bocconi, Cattolica (borse EDUCatt) e Luiss', () => {
  const course = (name: string, level: 'triennale' | 'magistrale' | 'ciclo-unico', classCode: string) =>
    ({ name, level, classCode, group: 'Economico' }) as Parameters<typeof maxContribution>[1];

  it('Bocconi: retta fissa per corso, uguale per ogni ISEE; borse ISU a tre fasce', () => {
    const rule = tuitionRuleFor('ateneo-01503')!;
    expect(maxContribution(rule, course('Economia Aziendale e Management', 'triennale', 'L-18'))).toBe(17000);
    expect(maxContribution(rule, course('Business (World Bachelor in Business)', 'triennale', 'L-18'))).toBe(25000);
    expect(maxContribution(rule, course('Marketing Management', 'magistrale', 'LM-77'))).toBe(18550);
    expect(contributionFor(rule, 5000, 17000)).toBe(17000);
    expect(fixedFeesRange(rule, exact(10000)).min).toBe(0);
    const isu = dsuEntityFor('ateneo-01503')!;
    expect(isu.id).toBe('isu-bocconi');
    expect(isu.thresholds).toMatchObject({ isee: 26887.93, ispe: 58452.06 });
    expect(amountAt(isu, 15000, 'fuoriSede')).toBe(7172);
  });

  it('Cattolica: tasse non inserite (usa un reddito equivalente proprio), borse EDUCatt con gli elenchi dei comuni', () => {
    expect(tuitionRuleFor('ateneo-01504')).toBeNull();
    const educatt = dsuEntityFor('ateneo-01504')!;
    expect(educatt.id).toBe('educatt');
    expect(amountAt(educatt, 20000, 'inSede')).toBe(2143);
    const check = (seat: string, city: string) => conditionFromMunicipality(educatt, seat, city, true)?.condition;
    expect(check('Milano', 'Sesto San Giovanni')).toBe('inSede');
    expect(check('Milano', 'Pavia')).toBe('pendolare');
    expect(check('Brescia', 'Rodengo Saiano')).toBe('inSede');
    expect(check('Piacenza', 'Castel San Giovanni')).toBe('pendolare');
    expect(check('Milano', 'Napoli')).toBe('fuoriSede');
  });

  it('Luiss: contributo unico senza fasce di reddito; borse DiSCo Lazio', () => {
    const rule = tuitionRuleFor('ateneo-05805')!;
    expect(maxContribution(rule, course('Economia e Management', 'triennale', 'L-18'))).toBe(14000);
    expect(maxContribution(rule, course('Management', 'magistrale', 'LM-77'))).toBe(17000);
    expect(contributionFor(rule, 8000, 14000)).toBe(14000);
    expect(dsuEntityFor('ateneo-05805')!.id).toBe('disco-lazio');
  });
});

describe('Private: la borsa non toglie la retta se l’ateneo non lo prevede', () => {
  it('Bocconi e Luiss: tasse dovute anche per chi è idoneo alla borsa', () => {
    const bocconi = getUniversityById('ateneo-01503')!;
    const cost = realCost(bocconi, null, exact(10000), exact(10000), 'inSede');
    expect(cost.scholarship?.status).toBe('eligible');
    expect(cost.lines.find((line) => line.key === 'tasse')?.min).toBe(17000);
    const luiss = realCost(getUniversityById('ateneo-05805')!, null, exact(10000), exact(10000), 'inSede');
    expect(luiss.lines.find((line) => line.key === 'tasse')?.min).toBe(14000);
  });

  it('Cattolica (EDUCatt): esonero per gli idonei come dice il bando', () => {
    const cost = realCost(getUniversityById('ateneo-01504')!, null, exact(10000), exact(10000), 'inSede');
    expect(cost.lines.find((line) => line.key === 'tasse')?.min).toBe(0);
  });
});

describe('Iuav 2026/27: tasse e borse regionali', () => {
  it('Tasse: no tax area fino a 26.000 €, poi i punti dei prospetti ufficiali', () => {
    const rule = tuitionRuleFor('ateneo-02702')!;
    expect(contributionFor(rule, 26000, 2806.18)).toBe(0);
    expect(contributionFor(rule, 28000, 2806.18)).toBe(840.25);
    expect(contributionFor(rule, 30000, 2806.18)).toBe(1191.88);
    expect(contributionFor(rule, 45000, 2806.18)).toBe(2081.52);
    expect(contributionFor(rule, 45500, 2806.18)).toBeCloseTo(2105.67, 1);
    expect(contributionFor(rule, 90000, 2806.18)).toBe(2806.18);
    expect(contributionFor(rule, null, 2806.18)).toBe(2806.18);
  });

  it('Borse: importi veneti, calo fino alla metà oltre 17.537,50 €', () => {
    const iuav = dsuEntityFor('ateneo-02702')!;
    expect(iuav.id).toBe('iuav-borse');
    expect(iuav.thresholds).toMatchObject({ isee: 26306.25, ispe: 43125.94 });
    expect(amountAt(iuav, 10000, 'fuoriSede')).toBe(8246);
    expect(amountAt(iuav, 15000, 'pendolare')).toBe(4190.71);
  });
});

describe('Piemonte Orientale 2026/27: tasse', () => {
  it('No tax area fino a 30.000 €, poi VUPO1 + VUPO2 per dipartimento', () => {
    const rule = tuitionRuleFor('ateneo-00201')!;
    const [a, b] = rule.courseGroups!;
    expect(contributionFor(rule, 30000, a.max, a.bands)).toBe(0);
    expect(contributionFor(rule, 35000, a.max, a.bands)).toBe(950);
    expect(contributionFor(rule, 77500, a.max, a.bands)).toBe(1862.5);
    expect(contributionFor(rule, 150000, a.max, a.bands)).toBe(2280);
    expect(contributionFor(rule, 45000, b.max, b.bands)).toBe(1349);
    expect(contributionFor(rule, null, b.max, b.bands)).toBe(2622);
  });
});

describe('Parthenope 2026/27: tasse a fasce', () => {
  const rule = tuitionRuleFor('ateneo-06302')!;
  const named = (name: string) => getCourses('ateneo-06302').find((course) => course.name.startsWith(name))!;

  it('Corsi ordinari: no tax area fino a 30.000 €, poi importi fissi', () => {
    expect(contributionFor(rule, 30000, 2359)).toBe(0);
    expect(contributionFor(rule, 30000.01, 2359)).toBe(480);
    expect(contributionFor(rule, 55000, 2359)).toBe(1669);
    expect(contributionFor(rule, 80000, 2359)).toBe(2359);
    expect(maxContribution(rule, named('Economia Aziendale'))).toBe(2359);
  });

  it('Area sanitaria: +20% per Infermieristica', () => {
    const nursing = named('Infermieristica');
    expect(maxContribution(rule, nursing)).toBe(2831);
    expect(contributionFor(rule, 42000, 2831, courseGroup(rule, nursing)!.bands)).toBe(1245);
  });
});

describe('Piemonte Orientale: gruppi per dipartimento', () => {
  const rule = tuitionRuleFor('ateneo-00201')!;
  const named = (name: string) => getCourses('ateneo-00201').find((course) => course.name === name)!;
  it('Medicina e Farmaco nel gruppo B, Servizio Sociale nel gruppo A', () => {
    expect(maxContribution(rule, named('Farmacia'))).toBe(2622);
    expect(maxContribution(rule, named('Biotecnologie'))).toBe(2622);
    expect(maxContribution(rule, named('Servizio Sociale'))).toBe(2280);
    expect(maxContribution(rule, named('Lettere'))).toBe(2280);
    expect(isExcludedCourse(rule, named('Chimica Verde'))).toBe(true);
  });
});

describe('Foro Italico: tasse per ISEE', () => {
  const rule = tuitionRuleFor('ateneo-05806')!;
  const named = (name: string) => getCourses('ateneo-05806').find((course) => course.name === name)!;
  it('Esonero fino a 23.000 €, poi 7% con le riduzioni del D.M. 1014, poi importi fissi', () => {
    const tri = courseGroup(rule, named('Corso di Laurea in Scienze Motorie e Sportive'))!;
    expect(contributionFor(rule, 23000, tri.max, tri.bands)).toBe(0);
    expect(contributionFor(rule, 25000, tri.max, tri.bands)).toBe(420);
    expect(contributionFor(rule, 40000, tri.max, tri.bands)).toBe(1201.98);
    expect(contributionFor(rule, null, tri.max, tri.bands)).toBe(1340.13);
    expect(maxContribution(rule, named('Management dello Sport'))).toBe(1987.65);
    expect(maxContribution(rule, named('Health And Physical Activity'))).toBe(1987.65);
  });
});

describe('Stranieri di Perugia 2026/27: tasse a fasce', () => {
  it('No tax area fino a 22.000 €, poi gli importi della Tabella G', () => {
    const rule = tuitionRuleFor('ateneo-05403')!;
    expect(contributionFor(rule, 22000, 1470)).toBe(0);
    expect(contributionFor(rule, 23000, 1470)).toBe(525);
    expect(contributionFor(rule, 40000, 1470)).toBe(1300);
    expect(contributionFor(rule, null, 1470)).toBe(1470);
  });
});

describe('Messina 2026/27: tasse', () => {
  it('No tax area fino a 28.000 €, poi le formule della Tabella COA', () => {
    const rule = tuitionRuleFor('ateneo-08301')!;
    expect(contributionFor(rule, 28000, 2650)).toBe(0);
    expect(contributionFor(rule, 29000, 2650)).toBe(350);
    expect(contributionFor(rule, 50000, 2650)).toBe(1640);
    expect(contributionFor(rule, 60000, 2650)).toBe(2260);
    expect(contributionFor(rule, 70000, 2650)).toBe(2650);
  });
});

describe('Teramo 2026/27: tasse', () => {
  const rule = tuitionRuleFor('ateneo-06701')!;
  const named = (name: string) => getCourses('ateneo-06701').find((course) => course.name === name)!;
  it('No tax area fino a 26.000 €, 7% ridotto fino a 30.000 €, poi fasce fisse', () => {
    expect(contributionFor(rule, 26000, 2600)).toBe(0);
    expect(contributionFor(rule, 27000, 2600)).toBe(735);
    expect(contributionFor(rule, 29000, 2600)).toBe(1008);
    expect(contributionFor(rule, 45000, 2600)).toBe(2075);
    expect(contributionFor(rule, null, 2600)).toBe(2600);
    expect(maxContribution(rule, named('Medicina Veterinaria'))).toBe(2700);
    expect(maxContribution(rule, named('Economia'))).toBe(2600);
  });
});

describe('ADSU Teramo 2026/27: borse', () => {
  it('Soglie e fasce abruzzesi, importi con vitto e alloggio', () => {
    const adsu = dsuEntityFor('ateneo-06701')!;
    expect(adsu.id).toBe('adsu-teramo');
    expect(adsu.thresholds).toMatchObject({ isee: 24335.11, ispe: 52902.43 });
    expect(amountAt(adsu, 18000, 'fuoriSede')).toBe(6324.1);
    expect(amountAt(adsu, 22000, 'inSede')).toBe(2462.91);
  });
});

describe('Unical 2026/27: tasse (fascia A)', () => {
  const rule = tuitionRuleFor('ateneo-07801')!;
  it('Coincide con la Tabella A dell’Allegato 1', () => {
    const table: [number, number][] = [[22000, 0], [25000, 420], [27000, 735], [29000, 1008], [30000, 1071], [31000, 1252.56], [35000, 1474.49], [38500, 1693.47], [40000, 1795], [42000, 1938.27], [48000, 2000]];
    for (const [isee, amount] of table) expect(contributionFor(rule, isee, 2000)).toBeCloseTo(amount, 0);
    expect(fixedFeesRange(rule, exact(30000)).min).toBe(158.75);
  });
});

describe('Mediterranea 2026/27: tasse', () => {
  it('Matricole esonerate fino a 22.000 €, poi la Tabella B', () => {
    const rule = tuitionRuleFor('ateneo-08001')!;
    expect(contributionFor(rule, 22000, 2165.29)).toBe(0);
    expect(contributionFor(rule, 22500, 2165.29)).toBe(770.29);
    expect(contributionFor(rule, 26500, 2165.29)).toBe(935.29);
    expect(contributionFor(rule, 34500, 2165.29)).toBe(1235.29);
    expect(contributionFor(rule, 60000, 2165.29)).toBe(2165.29);
  });
});

describe('Catanzaro 2026/27: tasse', () => {
  it('No tax area fino a 30.000 €, poi 4,2% oltre 13.000 € fino a 1.764 €', () => {
    const rule = tuitionRuleFor('ateneo-07901')!;
    expect(contributionFor(rule, 30000, 2520)).toBe(0);
    expect(contributionFor(rule, 31000, 2520)).toBe(756);
    expect(contributionFor(rule, 45000, 2520)).toBe(1344);
    expect(contributionFor(rule, 80000, 2520)).toBe(1764);
    expect(contributionFor(rule, null, 2520)).toBe(2520);
  });
});

describe('Fondazione UMG 2026/27: borse', () => {
  it('Soglie 26.500 / 57.500 €, +15% fino a 13.250 €, poi calo fino alla metà', () => {
    const umg = dsuEntityFor('ateneo-07901')!;
    expect(umg.id).toBe('fondazione-umg');
    expect(umg.thresholds).toMatchObject({ isee: 26500, ispe: 57500 });
    expect(amountAt(umg, 12000, 'fuoriSede')).toBe(8246.78);
    expect(amountAt(umg, 16000, 'pendolare')).toBe(4190.71);
  });
});

describe('ARDSU Basilicata 2026/27: borse', () => {
  it('Soglie nazionali, cinque fasce a scalini', () => {
    const ardsu = dsuEntityFor('ateneo-07601')!;
    expect(ardsu.id).toBe('ardsu-basilicata');
    expect(amountAt(ardsu, 10000, 'fuoriSede')).toBe(8246.7);
    expect(amountAt(ardsu, 18000, 'pendolare')).toBe(2800);
    expect(amountAt(ardsu, 25000, 'inSede')).toBe(1150);
  });
});

describe('ERSU Cagliari 2026/27: borse', () => {
  const ersu = dsuEntityFor('ateneo-09201')!;
  it('Soglie nazionali, importi con pasti, calo della sola parte in denaro', () => {
    expect(ersu.id).toBe('ersu-cagliari');
    expect(amountAt(ersu, 12000, 'fuoriSede')).toBe(8246.78);
    expect(amountAt(ersu, 16000, 'pendolare')).toBe(4190.71);
    expect(amountAt(ersu, 28339.88, 'fuoriSede')).toBeCloseTo(3951.07, 0);
  });
  it('Elenchi dei comuni per le sedi', () => {
    const check = (seat: string, city: string) => conditionFromMunicipality(ersu, seat, city, true)?.condition;
    expect(check('Cagliari', 'Quartu Sant\'Elena')).toBe('inSede');
    expect(check('Cagliari', 'Sestu')).toBe('pendolare');
    expect(check('Cagliari', 'Sassari')).toBe('fuoriSede');
    expect(check('Nuoro', 'Orgosolo')).toBe('pendolare');
  });
});

describe('Sassari 2026/27: tasse', () => {
  it('Tabella A: esonero fino a 22.000 €, poi a + (ISEE − b) × c', () => {
    const rule = tuitionRuleFor('ateneo-09001')!;
    expect(contributionFor(rule, 22000, 1750)).toBe(0);
    expect(contributionFor(rule, 26000, 1750)).toBe(240);
    expect(contributionFor(rule, 50000, 1750)).toBe(1400);
    expect(contributionFor(rule, 90000, 1750)).toBe(1750);
  });
});

describe('ERSU Sassari 2026/27: borse', () => {
  const ersu = dsuEntityFor('ateneo-09001')!;
  it('Importi come in Cagliari, elenchi dei comuni per sei sedi', () => {
    expect(ersu.id).toBe('ersu-sassari');
    expect(amountAt(ersu, 14000, 'pendolare')).toBe(4819.32);
    const check = (seat: string, city: string) => conditionFromMunicipality(ersu, seat, city, true)?.condition;
    expect(check('Sassari', 'Sassari')).toBe('inSede');
    expect(check('Sassari', 'Porto Torres')).toBe('pendolare');
    expect(check('Alghero', 'Sassari')).toBe('pendolare');
    expect(check('Sassari', 'Nuoro')).toBe('fuoriSede');
  });
});

describe('Molise 2026/27: tasse Unimol e borse ESU Molise', () => {
  const rule = tuitionRuleFor('ateneo-07001')!;
  const named = (name: string) => getCourses('ateneo-07001').find((course) => course.name === name)!;
  it('Unimol: no tax area fino a 24.000 €, poi formula con quota di indirizzo', () => {
    expect(contributionFor(rule, 24000, 1566)).toBe(0);
    expect(contributionFor(rule, 25000, 1566)).toBe(245);
    const eco = courseGroup(rule, named('Economia Aziendale'))!;
    expect(contributionFor(rule, 40000, eco.max, eco.bands)).toBe(1440);
    expect(maxContribution(rule, named('Scienze Biologiche'))).toBe(1606);
    expect(maxContribution(rule, named('Medicina e Chirurgia'))).toBe(1676);
    expect(contributionFor(rule, 80000, eco.max, eco.bands)).toBe(1566);
  });
  it('ESU Molise: soglie più basse, calo fino alla metà', () => {
    const esu = dsuEntityFor('ateneo-07001')!;
    expect(esu.thresholds).toMatchObject({ isee: 19837.92, ispe: 43125.94 });
    expect(amountAt(esu, 9000, 'fuoriSede')).toBe(8246.78);
    expect(amountAt(esu, 12000, 'inSede')).toBe(2890.16);
  });
});

describe('Chieti-Pescara 2026/27: tasse', () => {
  const rule = tuitionRuleFor('ateneo-06901')!;
  const named = (name: string) => getCourses('ateneo-06901').find((course) => course.name === name)!;
  it('Gruppo 1: esonero fino a 24.000 €, poi formule dell’Allegato 1', () => {
    expect(contributionFor(rule, 24000, 2000)).toBe(0);
    expect(contributionFor(rule, 30000, 2000)).toBe(450);
    expect(contributionFor(rule, 50000, 2000)).toBe(1400);
    expect(contributionFor(rule, 70000, 2000)).toBe(2000);
    const dent = courseGroup(rule, named('Odontoiatria e Protesi Dentaria'))!;
    expect(contributionFor(rule, 30000, dent.max, dent.bands)).toBe(750);
    expect(maxContribution(rule, named('Farmacia'))).toBe(2100);
    expect(maxContribution(rule, named('Servizio Sociale'))).toBe(2000);
  });
});

describe('Camerino 2026/27: tasse', () => {
  const rule = tuitionRuleFor('ateneo-04302')!;
  const named = (name: string) => getCourses('ateneo-04302').find((course) => course.name === name)!;
  const at = (name: string, isee: number) => {
    const group = courseGroup(rule, named(name))!;
    return contributionFor(rule, isee, group.max, group.bands);
  };
  it('Punti del simulatore ufficiale e riduzioni della pagina «Tasse»', () => {
    expect(at('Informatica', 26000)).toBe(0);
    expect(at('Informatica', 27000)).toBeCloseTo(0.75 * 905.67, 0);
    expect(at('Informatica', 35000)).toBeCloseTo(1228.3, 0);
    expect(at('Architettura', 50000)).toBe(1760);
    expect(at('Giurisprudenza', 30000.5)).toBeCloseTo(922.8, 0);
    expect(at('Fisica', 29000)).toBe(0);
    expect(at('Farmacia', 80000)).toBe(1925);
  });
});

describe('Trento: tasse dal simulatore ufficiale', () => {
  const rule = tuitionRuleFor('ateneo-02201')!;
  const [l, lm] = rule.courseGroups!;
  it('Punti del simulatore e punti intermedi entro pochi euro', () => {
    expect(contributionFor(rule, 26000, l.max, l.bands)).toBe(200);
    expect(contributionFor(rule, 30000, l.max, l.bands)).toBe(422.33);
    expect(Math.abs(contributionFor(rule, 45500, l.max, l.bands) - 1341.8)).toBeLessThan(3);
    expect(Math.abs(contributionFor(rule, 70500, lm.max, lm.bands) - 2996.32)).toBeLessThan(3);
    expect(contributionFor(rule, null, lm.max, lm.bands)).toBe(3159);
    expect(fixedFeesRange(rule, exact(20000)).min).toBe(166);
  });
});

describe('IULM 2026/27: tasse a fasce e borse regionali', () => {
  const rule = tuitionRuleFor('ateneo-01505')!;
  it('Sei fasce di ISEE a importo fisso, laurea e magistrale', () => {
    const [l, m] = rule.courseGroups!;
    expect(contributionFor(rule, 10000, l.max, l.bands)).toBe(3600);
    expect(contributionFor(rule, 40000, l.max, l.bands)).toBe(7700);
    expect(contributionFor(rule, null, m.max, m.bands)).toBe(12100);
    expect(dsuEntityFor('ateneo-01505')!.id).toBe('iulm-dsu');
    expect(amountAt(dsuEntityFor('ateneo-01505')!, 15000, 'fuoriSede')).toBe(7172);
  });
});

describe('LIUC 2026/27: retta unica e borse regionali', () => {
  const rule = tuitionRuleFor('ateneo-01201')!;
  const course = (name: string, level: string) =>
    getCourses('ateneo-01201').find((item) => item.name === name && degreeLevel(item) === level)!;
  it('Retta per corso, magistrali escluse finché non pubblicate', () => {
    expect(maxContribution(rule, course('Economia e Management', 'triennale'))).toBe(8500);
    expect(maxContribution(rule, course('Ingegneria Gestionale', 'triennale'))).toBe(7800);
    expect(isExcludedCourse(rule, course('Ingegneria Gestionale', 'triennale'))).toBe(false);
    expect(isExcludedCourse(rule, course('Ingegneria Gestionale', 'magistrale'))).toBe(true);
    expect(dsuEntityFor('ateneo-01201')!.id).toBe('liuc-dsu');
  });
});

describe('Kore Enna 2026/27: retta fissa per corso', () => {
  const rule = tuitionRuleFor('ateneo-08601')!;
  const named = (name: string) => getCourses('ateneo-08601').find((course) => course.name.startsWith(name))!;
  it('3.750 €, 18.000 € per Medicina, senza esonero automatico', () => {
    expect(maxContribution(rule, named('Giurisprudenza'))).toBe(3750);
    expect(maxContribution(rule, named('Medicina'))).toBe(18000);
    const cost = realCost(getUniversityById('ateneo-08601')!, named('Giurisprudenza'), exact(10000), exact(10000), 'inSede');
    expect(cost.lines.find((line) => line.key === 'tasse')?.max).toBe(3750);
  });
});

describe('Roma, private 2026/27: LUMSA e Campus Bio-Medico', () => {
  it('LUMSA: otto fasce di ISEE, Servizio sociale in prima fascia', () => {
    const rule = tuitionRuleFor('ateneo-05803')!;
    const named = (name: string) => getCourses('ateneo-05803').find((course) => course.name === name)!;
    const group = courseGroup(rule, named('Giurisprudenza'))!;
    expect(contributionFor(rule, 20000, group.max, group.bands)).toBe(4250);
    expect(contributionFor(rule, null, group.max, group.bands)).toBe(8750);
    expect(maxContribution(rule, named('Scienze del Servizio Sociale e del No Profit'))).toBe(3500);
  });
  it('Campus Bio-Medico: contributo per corso', () => {
    const rule = tuitionRuleFor('ateneo-05808')!;
    const named = (name: string, level: string) =>
      getCourses('ateneo-05808').find((course) => course.name === name && degreeLevel(course) === level)!;
    expect(maxContribution(rule, getCourses('ateneo-05808').find((course) => course.name === 'Medicina e Chirurgia')!)).toBe(15500);
    expect(maxContribution(rule, named('Scienze dell\'Alimentazione e della Nutrizione Umana', 'triennale'))).toBe(5621.5);
    expect(maxContribution(rule, named('Scienze dell\'Alimentazione e della Nutrizione Umana', 'magistrale'))).toBe(6132.73);
  });
});

describe('Roma, private 2026/27: UNINT e Link Campus', () => {
  it('UNINT: retta unica 6.900 €', () => {
    expect(tuitionRuleFor('ateneo-05809')!.maxByLevel.triennale).toBe(6900);
  });
  it('Link Campus: retta per classe di laurea più diritto di iscrizione', () => {
    const rule = tuitionRuleFor('ateneo-05817')!;
    const named = (name: string) => getCourses('ateneo-05817').find((course) => course.name.startsWith(name))!;
    expect(maxContribution(rule, named('Giurisprudenza'))).toBe(8250);
    expect(maxContribution(rule, named('Osteopatia'))).toBe(12150);
    expect(maxContribution(rule, named('Medicina e Chirurgia'))).toBe(20050);
    expect(isExcludedCourse(rule, named('Tecniche di Laboratorio'))).toBe(true);
  });
});

describe('Valle d’Aosta 2026/27: tasse a sei fasce', () => {
  it('Importi fissi per fascia, tassa regionale e bollo compresi', () => {
    const rule = tuitionRuleFor('ateneo-00701')!;
    const named = (name: string) => getCourses('ateneo-00701').find((course) => course.name === name)!;
    const tri = courseGroup(rule, named('Economia e Management'))!;
    expect(contributionFor(rule, 10000, tri.max, tri.bands)).toBe(1061);
    expect(contributionFor(rule, null, tri.max, tri.bands)).toBe(1729);
    expect(maxContribution(rule, named('Scienze della Formazione Primaria'))).toBe(2171);
  });
});

describe('San Raffaele 2026/27: retta per corso e borse regionali', () => {
  const rule = tuitionRuleFor('ateneo-01508')!;
  const course = (name: string, level: string) =>
    getCourses('ateneo-01508').find((item) => item.name === name && degreeLevel(item) === level)!;
  it('Retta del primo anno meno 206 € di tassa regionale e bollo, uguale per ogni ISEE', () => {
    const medicina = course('Medicina e Chirurgia', 'ciclo-unico');
    expect(maxContribution(rule, medicina) + rule.fixedFees.total).toBe(20190);
    expect(contributionFor(rule, 5000, maxContribution(rule, medicina))).toBe(19984);
    expect(maxContribution(rule, course('Medicine And Surgery', 'ciclo-unico')) + 206).toBe(20690);
    expect(maxContribution(rule, course('Filosofia', 'triennale')) + 206).toBe(5490);
    expect(maxContribution(rule, course('Psicologia', 'magistrale')) + 206).toBe(8190);
    const nursing = getCourses('ateneo-01508').filter((item) => item.name.startsWith('Infermieristica'));
    for (const item of nursing) expect(maxContribution(rule, item) + 206).toBe(2590);
    expect(isExcludedCourse(rule, course('Biotechnology And Medical Biology', 'magistrale'))).toBe(true);
    expect(rule.noScholarshipExemption).toBeUndefined();
  });
  it('Borse lombarde con 80/100 alla maturità per le matricole', () => {
    const unisr = dsuEntityFor('ateneo-01508')!;
    expect(unisr.id).toBe('unisr-dsu');
    expect(amountAt(unisr, 15000, 'fuoriSede')).toBe(7172);
    expect(amountAt(unisr, 20000, 'inSede')).toBe(2143);
    expect(scholarshipFor(unisr, exact(12000), none, 'pendolare', { grade: 75, firstCycle: true })).toMatchObject({
      status: 'not-eligible',
      gradeTooLow: 80
    });
    expect(scholarshipFor(unisr, exact(12000), none, 'pendolare', { grade: 85, firstCycle: true }).amountMax).toBe(4820);
  });
});

describe('Humanitas 2026/27: borse regionali (tasse con indice ISEP, non inserite)', () => {
  it('Importi lombardi, 80/100 alla maturità, nessuna regola tasse', () => {
    const humanitas = dsuEntityFor('ateneo-01510')!;
    expect(humanitas.id).toBe('humanitas-dsu');
    expect(amountAt(humanitas, 10000, 'fuoriSede')).toBe(8248);
    expect(amountAt(humanitas, 25000, 'pendolare')).toBe(3299);
    expect(humanitas.minDiplomaGrade).toBe(80);
    expect(tuitionRuleFor('ateneo-01510')).toBeNull();
  });
});

describe('Scienze Gastronomiche 2026/27: retta fissa e borse EDISU', () => {
  const rule = tuitionRuleFor('ateneo-00401')!;
  const named = (name: string) => getCourses('ateneo-00401').find((course) => course.name === name)!;
  it('15.500 € in triennale e 14.000 € in magistrale per ogni ISEE; esonero EDISU non garantito', () => {
    const lt = named('Scienze e Culture Gastronomiche');
    expect(degreeLevel(lt)).toBe('triennale');
    expect(contributionFor(rule, 8000, maxContribution(rule, lt))).toBe(15500);
    expect(maxContribution(rule, named('Food Industry Management'))).toBe(14000);
    expect(rule.noScholarshipExemption).toContain('103.000');
    expect(dsuEntityFor('ateneo-00401')!.id).toBe('edisu-piemonte');
  });
});

describe('LUM 2026/27: contributo unico per corso', () => {
  const rule = tuitionRuleFor('ateneo-07203')!;
  const course = (name: string, level: string) =>
    getCourses('ateneo-07203').find((item) => item.name === name && degreeLevel(item) === level)!;
  it('Importi del Manifesto per le matricole, uguali per ogni ISEE', () => {
    expect(maxContribution(rule, course('Business Economics And Organization', 'triennale'))).toBe(6000);
    expect(contributionFor(rule, 15000, maxContribution(rule, course('Ingegneria Gestionale', 'magistrale')))).toBe(7000);
    expect(maxContribution(rule, course('Giurisprudenza', 'ciclo-unico'))).toBe(6200);
    expect(maxContribution(rule, course('Medicina e Chirurgia', 'ciclo-unico'))).toBe(16500);
    expect(maxContribution(rule, course('Odontoiatria e Protesi Dentaria', 'ciclo-unico'))).toBe(20600);
    expect(maxContribution(rule, course('Infermieristica (Abilitante alla Professione Sanitaria di Infermiere)', 'triennale'))).toBe(4000);
    expect(isExcludedCourse(rule, course('Ingegneria Informatica per la Transizione Digitale', 'triennale'))).toBe(true);
    expect(fixedFeesRange(rule, exact(20000)).min).toBe(162);
    expect(rule.noScholarshipExemption).toContain('ADISU');
  });
});

describe('Suor Orsola Benincasa 2026/27: sei fasce per corso', () => {
  const rule = tuitionRuleFor('ateneo-06304')!;
  const named = (name: string, classCode?: string) =>
    getCourses('ateneo-06304').find((course) => course.name === name && (!classCode || course.classCode === classCode))!;
  it('Totale della tabella più il contributo di immatricolazione', () => {
    const com = courseGroup(rule, named('Scienze della Comunicazione'))!;
    expect(com.id).toBe('unisob-a');
    expect(contributionFor(rule, 8000, com.max, com.bands)).toBe(2640);
    expect(contributionFor(rule, 30000, com.max, com.bands)).toBe(3300);
    expect(contributionFor(rule, null, com.max, com.bands)).toBe(4280);
    const giur = courseGroup(rule, named('Giurisprudenza'))!;
    expect(contributionFor(rule, 12000, giur.max, giur.bands)).toBe(3880);
    for (const code of ['LM-57', 'LM-85']) expect(courseGroup(rule, named('Consulenza Pedagogica', code))!.id).toBe('unisob-l');
    expect(fixedFeesRange(rule, exact(20000)).min).toBe(146);
    expect(rule.noScholarshipExemption).toContain('colonne A e B');
    expect(dsuEntityFor('ateneo-06304')!.id).toBe('adisurc');
  });
  it('ogni corso del dataset ha il suo gruppo', () => {
    const names = rule.courseGroups!.flatMap((group) => group.names!);
    for (const course of getCourses('ateneo-06304')) expect(names).toContain(course.name);
  });
});

describe('Stranieri Dante Alighieri 2026/27: otto fasce e borse dell’Ateneo', () => {
  const rule = tuitionRuleFor('ateneo-08003')!;
  it('Totale annuo della tabella meno 160 € di bollo, tassa regionale e assicurazione', () => {
    expect(contributionFor(rule, 4000, 2096) + rule.fixedFees.total).toBe(564);
    expect(contributionFor(rule, 22000, 2096) + rule.fixedFees.total).toBe(1056);
    expect(contributionFor(rule, 60000, 2096) + rule.fixedFees.total).toBe(2256);
    expect(contributionFor(rule, null, 2096)).toBe(2096);
  });
  it('Borse con la tabella della Circolare MUR e soglie nazionali', () => {
    const unida = dsuEntityFor('ateneo-08003')!;
    expect(unida.id).toBe('unida-dsu');
    expect(amountAt(unida, 10000, 'fuoriSede')).toBe(8246.78);
    expect(amountAt(unida, 28339.88, 'inSede')).toBe(1445.08);
  });
});
