import { NextResponse, type NextRequest } from 'next/server';
import { resolveScholarshipLink } from '@/lib/scraping/scholarship-link';
import { getDirectoryUniversity } from '@/lib/scraping/shared';

export const maxDuration = 20;

const CACHE = 's-maxage=604800, stale-while-revalidate=2592000';

// Reindirizza alla pagina borse dell'ateneo o dell'ente regionale (JSON con ?format=json).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const university = getDirectoryUniversity((params.get('universityId') || '').trim());
  if (!university) {
    return NextResponse.json({ error: 'Ateneo non valido.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }

  const result = await resolveScholarshipLink(university);
  if (params.get('format') === 'json') {
    return NextResponse.json(
      { universityId: university.id, university: university.name, ...result },
      { headers: { 'cache-control': CACHE } }
    );
  }
  return NextResponse.redirect(result.url, { status: 302, headers: { 'cache-control': CACHE } });
}
