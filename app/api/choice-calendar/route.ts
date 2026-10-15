import { NextResponse, type NextRequest } from 'next/server';
import { getUniversityById } from '@/lib/data';
import { choiceCalendar } from '@/lib/domain/choice-calendar';

// Calendario della scelta (ISEE, borsa, test) per un ateneo: dati curati a mano con fonte.
export async function GET(request: NextRequest) {
  const university = getUniversityById(request.nextUrl.searchParams.get('ateneo') || '');
  if (!university) return NextResponse.json({ error: 'Ateneo non trovato.' }, { status: 404 });
  return NextResponse.json(
    { universityId: university.id, items: choiceCalendar(university.id) },
    { headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400' } }
  );
}
