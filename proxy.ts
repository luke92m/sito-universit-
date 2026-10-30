import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './lib/supabase/config';

// Cookie della sessione Supabase: sb-<progetto>-auth-token, eventualmente diviso in .0, .1, ...
function hasSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'));
}

// Aggiorna i cookie della sessione Supabase a ogni richiesta di pagina.
// Chi non ha una sessione riceve una risposta senza modifiche: su Cloudflare la cache Workers la serve
// solo se il proxy non riscrive la richiesta, quindi NextResponse.next({ request }) solo quando servono cookie nuovi.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next();
  if (!isSupabaseConfigured || !hasSessionCookie(request)) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  // Non inserire logica tra la creazione del client e getUser(): serve a rinnovare il token.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/course-link|api/scholarship-link|api/deadlines|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)']
};
