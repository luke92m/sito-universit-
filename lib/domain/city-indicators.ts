// Porting di legacy/js/city-indicators-2026.js (affitti, spesa ISTAT, qualità della vita giovani).
import { CITY_INDICATORS } from '../data';
import { normalize } from './text';

const ROOM_RENTS = CITY_INDICATORS.roomRents;
const MACRO_SPENDING = CITY_INDICATORS.macroSpending;
const YOUTH_QUALITY = CITY_INDICATORS.youthQuality;
export const CITY_SOURCES = CITY_INDICATORS.sources;

const RENT_FALLBACK_BY_MACRO: Record<string, number> = {
  'Nord-Ovest': 479,
  'Nord-Est': 444,
  Centro: 388,
  Sud: 301,
  Isole: 300,
  Italia: 370
};

function fuzzyEntry<T>(object: Record<string, T>, value: unknown) {
  const needle = normalize(value);
  if (!needle) return null;
  const exact = Object.entries(object).find(([key]) => normalize(key) === needle);
  if (exact) return { key: exact[0], value: exact[1], exact: true };
  const partial = Object.entries(object).find(([key]) => {
    const clean = normalize(key);
    return needle.length >= 4 && (clean.includes(needle) || needle.includes(clean));
  });
  return partial ? { key: partial[0], value: partial[1], exact: false } : null;
}

export function roomRent(city: string, macroArea = 'Italia') {
  const match = fuzzyEntry(ROOM_RENTS, city);
  if (match) return { amount: Number(match.value), city: match.key, exact: true };
  return {
    amount: RENT_FALLBACK_BY_MACRO[macroArea] || RENT_FALLBACK_BY_MACRO.Italia,
    city: city || macroArea,
    exact: false
  };
}

export function youth(province: string, city = '') {
  const match = fuzzyEntry(YOUTH_QUALITY, province) || fuzzyEntry(YOUTH_QUALITY, city);
  if (!match) return null;
  return { province: match.key, rank: Number(match.value[0]), score: Number(match.value[1]), total: 107 };
}

export function studentMonthlyEstimate(city: string, macroArea = 'Italia') {
  const rent = roomRent(city, macroArea);
  const householdSpending = MACRO_SPENDING[macroArea] || MACRO_SPENDING.Italia;
  // Stima trasparente: camera singola + 24% della spesa familiare media della ripartizione
  // per alimentazione, trasporti, utenze e spese personali di uno studente.
  const nonHousing = Math.round((householdSpending * 0.24) / 10) * 10;
  return {
    monthly: rent.amount + nonHousing,
    rent: rent.amount,
    nonHousing,
    householdSpending,
    rentExact: rent.exact,
    macroArea
  };
}
