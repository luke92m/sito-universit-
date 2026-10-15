import { isEnabled } from '../features';

// Chiavi pubbliche del progetto Supabase (da .env.local / variabili Vercel).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Senza chiavi, o con gli account spenti (lib/features.ts), il sito funziona comunque senza Supabase:
 * nessuna sessione, nessun cookie di accesso e nessun dato salvato sul server.
 */
export const isSupabaseConfigured = isEnabled('account') && Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
