import { NextResponse } from 'next/server';
import { getCourses, getUniversityById } from '@/lib/data';

// Corsi di un ateneo per i selettori del client (il dataset completo resta sul server).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getUniversityById(id)) return NextResponse.json({ error: 'Ateneo non trovato.' }, { status: 404 });
  const courses = getCourses(id)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'it'))
    .map(({ id: courseId, name, classCode, level, group, city, access, delivery }) => ({
      id: courseId,
      name,
      classCode,
      level,
      group,
      city,
      access,
      delivery
    }));
  return NextResponse.json(
    { courses },
    { headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' } }
  );
}
