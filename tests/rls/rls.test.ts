import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica delle policy RLS su un progetto Supabase reale.
// Richiede due utenti di test già confermati (vedi README, sezione "Test"):
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
//   RLS_USER_A_EMAIL, RLS_USER_A_PASSWORD, RLS_USER_B_EMAIL, RLS_USER_B_PASSWORD
const env = process.env;
const configured = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    env.RLS_USER_A_EMAIL &&
    env.RLS_USER_A_PASSWORD &&
    env.RLS_USER_B_EMAIL &&
    env.RLS_USER_B_PASSWORD
);

async function signedIn(email: string, password: string): Promise<{ client: SupabaseClient; id: string }> {
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Accesso non riuscito per ${email}: ${error?.message}`);
  return { client, id: data.user.id };
}

describe.skipIf(!configured)('policy RLS', () => {
  let a: { client: SupabaseClient; id: string };
  let b: { client: SupabaseClient; id: string };
  const university = 'ateneo-03701';
  const course = `RLS test ${Date.now()}`;
  let listingId = '';
  let messageId = '';

  beforeAll(async () => {
    a = await signedIn(env.RLS_USER_A_EMAIL!, env.RLS_USER_A_PASSWORD!);
    b = await signedIn(env.RLS_USER_B_EMAIL!, env.RLS_USER_B_PASSWORD!);
  });

  afterAll(async () => {
    if (listingId) await a.client.from('book_listings').delete().eq('id', listingId);
    if (messageId) await a.client.from('community_messages').delete().eq('id', messageId);
  });

  it('ogni utente vede solo il proprio profilo', async () => {
    const { data } = await a.client.from('profiles').select('id');
    expect(data?.map((row) => row.id)).toEqual([a.id]);
  });

  it('il ruolo non è modificabile dall’utente', async () => {
    const { error } = await a.client.from('profiles').update({ role: 'admin' }).eq('id', a.id);
    expect(error).not.toBeNull();
  });

  it('un utente non può modificare il profilo di un altro', async () => {
    const { data } = await b.client.from('profiles').update({ display_name: 'intruso' }).eq('id', a.id).select();
    expect(data).toEqual([]);
  });

  it('annunci: visibili agli altri ma cancellabili solo dal venditore', async () => {
    const created = await a.client
      .from('book_listings')
      .insert({ seller_alias: 'test', university_id: university, course_name: course, type: 'sell', title: 'Libro di prova' })
      .select('id')
      .single();
    expect(created.error).toBeNull();
    listingId = created.data!.id;

    const seen = await b.client.from('book_listings').select('id').eq('id', listingId);
    expect(seen.data).toHaveLength(1);

    await b.client.from('book_listings').delete().eq('id', listingId);
    const stillThere = await a.client.from('book_listings').select('id').eq('id', listingId);
    expect(stillThere.data).toHaveLength(1);
  });

  it('non si può pubblicare a nome di un altro utente', async () => {
    const { error } = await b.client
      .from('community_messages')
      .insert({ author_id: a.id, author_alias: 'falso', university_id: university, body: 'messaggio' });
    expect(error).not.toBeNull();
  });

  it('messaggi della community visibili agli utenti registrati', async () => {
    const created = await a.client
      .from('community_messages')
      .insert({ author_alias: 'test', university_id: university, course_name: course, body: 'Ciao dal test RLS' })
      .select('id')
      .single();
    expect(created.error).toBeNull();
    messageId = created.data!.id;
    const seen = await b.client.from('community_messages').select('id').eq('id', messageId);
    expect(seen.data).toHaveLength(1);
  });

  it('borse salvate e preferenze restano private', async () => {
    const saved = await a.client
      .from('saved_scholarships')
      .insert({ university_id: university, university_name: 'Bologna', status: 'unknown', status_label: 'test' })
      .select('id')
      .single();
    expect(saved.error).toBeNull();
    const seen = await b.client.from('saved_scholarships').select('id').eq('id', saved.data!.id);
    expect(seen.data).toEqual([]);
    await a.client.from('saved_scholarships').delete().eq('id', saved.data!.id);
  });
});
