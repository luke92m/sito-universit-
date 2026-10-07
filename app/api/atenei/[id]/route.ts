import { NextResponse } from 'next/server';
import { universityCard } from '@/lib/domain/catalog';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = universityCard(id);
  if (!card) return NextResponse.json({ error: 'Ateneo non trovato.' }, { status: 404 });
  return NextResponse.json(card, { headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400' } });
}
