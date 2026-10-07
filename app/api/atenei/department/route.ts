import { NextResponse, type NextRequest } from 'next/server';
import { departmentRankings } from '@/lib/domain/catalog';

export async function GET(request: NextRequest) {
  const group = request.nextUrl.searchParams.get('group') || '';
  return NextResponse.json(
    { group, rankings: departmentRankings(group) },
    { headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400' } }
  );
}
