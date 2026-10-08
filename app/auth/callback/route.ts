import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// Destinazione dei link nelle email (conferma registrazione, reimpostazione password).
// Supporta sia il flusso PKCE (?code=) sia il token hash (?token_hash=&type=).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = searchParams.get('next') || '/';
  // Solo percorsi interni: evita redirect aperti verso domini esterni.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const code = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(safeNext, origin));
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (!error) return NextResponse.redirect(new URL(safeNext, origin));
    }
  }

  return NextResponse.redirect(new URL('/accesso-non-riuscito', origin));
}
