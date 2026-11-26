import { NextResponse } from 'next/server';
import { searchCourseNames } from '@/lib/domain/course-names';

// Ricerca dei nomi reali dei corsi per «Trova la mia università» (il dataset completo resta sul server).
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get('q') || '').slice(0, 80);
  const results = searchCourseNames(query, 10).map(({ name, universities, group, levels }) => ({
    name,
    universities,
    group,
    levels
  }));
  return NextResponse.json(
    { results },
    { headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' } }
  );
}
