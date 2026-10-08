import { NextResponse } from 'next/server';
import { compareCourses, compareUniversities } from '@/lib/domain/comparison';
import { DIMENSIONS } from '@/lib/domain/course-catalog';
import type { ScoreVector } from '@/lib/types';

const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length < 80;

// Il vettore delle preferenze arriva dal browser: si accettano solo le dimensioni note e valori numerici.
function readVector(value: unknown): ScoreVector | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const vector: ScoreVector = {};
  for (const dimension of DIMENSIONS) {
    const number = Number(source[dimension] ?? 0);
    if (!Number.isFinite(number)) return null;
    vector[dimension] = number;
  }
  return vector;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });

  if (body.mode === 'universities') {
    if (!isId(body.leftId) || !isId(body.rightId)) {
      return NextResponse.json({ error: 'Seleziona due università.' }, { status: 400 });
    }
    const result = compareUniversities(body.leftId, body.rightId);
    if (!result) return NextResponse.json({ error: 'Ateneo non trovato.' }, { status: 404 });
    return NextResponse.json(result);
  }

  if (body.mode === 'courses') {
    const { leftId, leftCourseId, rightId, rightCourseId } = body;
    if (!isId(leftId) || !isId(leftCourseId) || !isId(rightId) || !isId(rightCourseId)) {
      return NextResponse.json({ error: 'Seleziona due corsi.' }, { status: 400 });
    }
    const result = compareCourses(leftId, leftCourseId, rightId, rightCourseId, readVector(body.vector));
    if (!result) return NextResponse.json({ error: 'Corso non trovato.' }, { status: 404 });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Tipo di confronto non valido.' }, { status: 400 });
}
