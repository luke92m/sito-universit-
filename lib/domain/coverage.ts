// Quali atenei hanno dati verificati nel sito: tasse per ISEE (regolamento dell'ateneo) e borsa
// (bando dell'ente regionale). Unica fonte per pagine, finder e comparatore. Solo server: legge i JSON completi.
import { UNIVERSITIES } from '../data';
import type { University } from '../types';
import { DSU_ENTITIES, dsuEntityFor } from './dsu';
import { tuitionRuleFor } from './tuition';

export interface Coverage {
  /** Tasse calcolate con le regole per fascia ISEE dell'ateneo. */
  tuition: boolean;
  /** Ente regionale con il bando della borsa nel sito (nome breve), oppure null. */
  scholarship: string | null;
}

export function coverageOf(universityId: string): Coverage {
  return {
    tuition: Boolean(tuitionRuleFor(universityId)),
    scholarship: dsuEntityFor(universityId)?.shortName || null
  };
}

/** Vero se tasse e borsa sono entrambe verificate: il costo reale è completo. */
export const isFullyCovered = (universityId: string): boolean => {
  const coverage = coverageOf(universityId);
  return coverage.tuition && Boolean(coverage.scholarship);
};

const byName = (a: University, b: University) => a.name.localeCompare(b.name, 'it');

/** Atenei con le tasse per ISEE verificate, in ordine alfabetico. */
export const universitiesWithTuition = (): University[] =>
  UNIVERSITIES.filter((university) => coverageOf(university.id).tuition).sort(byName);

/** Atenei coperti da un bando per la borsa nel sito, in ordine alfabetico. */
export const universitiesWithScholarship = (): University[] =>
  UNIVERSITIES.filter((university) => coverageOf(university.id).scholarship).sort(byName);

/** Enti regionali con il bando nel sito, con l'anno accademico, la data di verifica e il bando. */
export const scholarshipEntities = () =>
  DSU_ENTITIES.map(({ id, name, shortName, region, academicYear, verifiedAt, universityIds, amounts }) => ({
    id,
    name,
    shortName,
    region,
    academicYear,
    verifiedAt,
    universities: universityIds.length,
    source: amounts.source
  }));

/** Regolamenti delle tasse nel sito, uno per ateneo, in ordine alfabetico. */
export const tuitionSources = () =>
  universitiesWithTuition().map((university) => {
    const rule = tuitionRuleFor(university.id)!;
    return {
      universityId: university.id,
      university: university.name,
      academicYear: rule.academicYear,
      verifiedAt: rule.verifiedAt,
      source: rule.bandsSource,
      estimatedBetweenBands: Boolean(rule.bandsNote)
    };
  });
