import { NextResponse, type NextRequest } from 'next/server';
import { resolveCourseLink } from '@/lib/scraping/course-link';
import { getDirectoryUniversity } from '@/lib/scraping/shared';

export const maxDuration = 20;

const CACHE = 's-maxage=604800, stale-while-revalidate=2592000';

// Reindirizza alla pagina ufficiale del corso (oppure la restituisce in JSON con ?format=json).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const university = getDirectoryUniversity((params.get('universityId') || '').trim());
  const courseName = (params.get('course') || '').trim().slice(0, 220);
  const classCode = (params.get('classCode') || '').trim().slice(0, 40);
  if (!university || !courseName) {
    return NextResponse.json({ error: 'Ateneo o corso non valido.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }

  const result = await resolveCourseLink(university, courseName, classCode);
  if (params.get('format') === 'json') {
    return NextResponse.json(
      { universityId: university.id, university: university.name, course: courseName, ...result },
      { headers: { 'cache-control': CACHE } }
    );
  }
  return NextResponse.redirect(result.url, { status: 302, headers: { 'cache-control': CACHE } });
}
