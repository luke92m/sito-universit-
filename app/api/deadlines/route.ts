import { NextResponse, type NextRequest } from 'next/server';
import { findDeadlines } from '@/lib/scraping/deadlines';
import { getDirectoryUniversity } from '@/lib/scraping/shared';

export const maxDuration = 20;

// Scadenze rilevate automaticamente dalle fonti ufficiali (cache CDN di 6 ore).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const university = getDirectoryUniversity((params.get('universityId') || '').trim());
  if (!university) {
    return NextResponse.json({ error: 'Ateneo non valido.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }
  const courseName = (params.get('course') || '').trim().slice(0, 220);
  const mode = (params.get('situation') || '').trim() === 'enrolling' ? 'enrolling' : 'university';

  const { ok, ...result } = await findDeadlines(university, courseName, mode);
  return NextResponse.json(result, {
    headers: {
      'cache-control': ok ? 's-maxage=21600, stale-while-revalidate=86400' : 's-maxage=900, stale-while-revalidate=3600'
    }
  });
}
