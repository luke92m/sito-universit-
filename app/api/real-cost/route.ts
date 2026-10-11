import { NextResponse } from 'next/server';
import { getCourse, getUniversityById } from '@/lib/data';
import { STUDENT_SERVICES } from '@/lib/data/student-services';
import {
  conditionFromMunicipality,
  dsuEntityFor,
  type EconomicRange,
  type StudentCondition
} from '@/lib/domain/dsu';
import { getIseeRange, findRange } from '@/lib/domain/isee';
import { realCost, type RealCost } from '@/lib/domain/real-cost';
import { normalize } from '@/lib/domain/text';
import { isCourseId } from '@/lib/flow/journey-params';
import type { Range } from '@/lib/types';

// "Quanto ti costa davvero": i dati economici arrivano nel corpo della richiesta e non vengono salvati.

const CONDITIONS: StudentCondition[] = ['fuoriSede', 'pendolare', 'inSede'];

export interface ConditionInfo {
  condition: StudentCondition;
  /** tabella-1/2: comune elencato dall'ente; fuori-tabella: non elencato; stima: senza tabelle; scelta: indicata dall'utente. */
  origin: 'tabella-1' | 'tabella-2' | 'fuori-tabella' | 'stima' | 'scelta';
  /** Condizione che risulterebbe dalle tabelle, quando l'utente ne ha scelta un'altra. */
  suggested: StudentCondition | null;
  seat: string;
  sourceUrl: string | null;
}

export interface RealCostResponse extends RealCost {
  conditionInfo: ConditionInfo;
}

function economic(
  value: unknown,
  ranges: Range[],
  read: (value: string) => Range | null
): EconomicRange | null {
  if (!value || typeof value !== 'object') return { min: null, max: null };
  const { exact, range } = value as { exact?: unknown; range?: unknown };
  if (exact != null && exact !== '') {
    const number = Number(exact);
    if (!Number.isFinite(number) || number < 0 || number > 10_000_000) return null;
    return { min: number, max: number };
  }
  if (typeof range !== 'string' || !range) return { min: null, max: null };
  const found = read(range);
  if (!found || !ranges.includes(found)) return null;
  return { min: found.min ?? null, max: found.max ?? null };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const university = typeof body?.universityId === 'string' ? getUniversityById(body.universityId) : null;
  if (!body || !university) return NextResponse.json({ error: 'Seleziona un ateneo.' }, { status: 400 });

  const courseId = typeof body.courseId === 'string' && isCourseId(body.courseId) ? body.courseId : '';
  const course = courseId ? getCourse(university.id, courseId) : null;
  const isee = economic(body.isee, STUDENT_SERVICES.iseeRanges, getIseeRange);
  const ispe = economic(body.ispe, STUDENT_SERVICES.ispeRanges, (value) =>
    findRange(STUDENT_SERVICES.ispeRanges, value)
  );
  if (!isee || !ispe) return NextResponse.json({ error: 'Valori ISEE o ISPE non validi.' }, { status: 400 });

  const residenceCity = typeof body.residenceCity === 'string' ? body.residenceCity.trim().slice(0, 80) : '';
  const residenceRegion = typeof body.residenceRegion === 'string' ? body.residenceRegion : '';
  const rentsNearSeat = body.rentsNearSeat !== false;
  const seat = course?.city || university.city;

  // Condizione: tabelle dell'ente se disponibili, altrimenti stima da città e regione di residenza.
  const entity = dsuEntityFor(university.id);
  const table = entity ? conditionFromMunicipality(entity, seat, residenceCity, rentsNearSeat) : null;
  const estimated: StudentCondition =
    residenceCity && normalize(residenceCity) === normalize(seat)
      ? 'inSede'
      : residenceRegion === university.region && !rentsNearSeat
        ? 'pendolare'
        : rentsNearSeat
          ? 'fuoriSede'
          : 'pendolare';
  const suggested = table?.condition || estimated;
  const chosen = CONDITIONS.includes(body.condition as StudentCondition)
    ? (body.condition as StudentCondition)
    : null;
  const condition = chosen || suggested;

  const conditionInfo: ConditionInfo = {
    condition,
    origin: chosen && chosen !== suggested ? 'scelta' : table ? table.origin : 'stima',
    suggested: chosen && chosen !== suggested ? suggested : null,
    seat,
    sourceUrl: table?.source.url || null
  };

  const payload: RealCostResponse = { ...realCost(university, course, isee, ispe, condition), conditionInfo };
  return NextResponse.json(payload, { headers: { 'cache-control': 'no-store' } });
}
