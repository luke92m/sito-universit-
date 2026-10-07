// Chiavi pubbliche del progetto Supabase (da .env.local / variabili Vercel).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/** Senza chiavi il sito funziona comunque: gli strumenti con account mostrano un avviso. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
