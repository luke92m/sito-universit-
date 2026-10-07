'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSite } from '@/components/site/SiteProvider';
import type { SiteUser } from '@/lib/client/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ContextSetup, useGroupContext } from './GroupContext';

interface Listing {
  id: string;
  seller_id: string;
  seller_alias: string;
  type: 'sell' | 'buy';
  title: string;
  author: string;
  price: number | null;
  condition: string;
  notes: string;
  contact: string;
  created_at: string;
}

const CONDITIONS = ['Come nuovo', 'Buono stato', 'Con sottolineature', 'Da valutare'];

export function BooksSection({ user }: { user: SiteUser }) {
  const { getUniversity, showToast } = useSite();
  const { context, save, reset, fromProfile } = useGroupContext(user, 'books');
  const [listings, setListings] = useState<Listing[]>([]);
  const [form, setForm] = useState({
    type: 'sell',
    title: '',
    author: '',
    price: '',
    condition: CONDITIONS[0],
    notes: '',
    contact: user.email
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);

  const hasExactContext = Boolean(context?.universityId && context?.courseName);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !context?.universityId || !context.courseName) return;
    const { data } = await supabase
      .from('book_listings')
      .select('id, seller_id, seller_alias, type, title, author, price, condition, notes, contact, created_at')
      .eq('university_id', context.universityId)
      .eq('course_name', context.courseName)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    setListings((data as Listing[]) || []);
  }, [context]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (context === undefined) return <p className="empty-state">Caricamento del gruppo…</p>;
  const university = hasExactContext ? getUniversity(context?.universityId) : null;
  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const publish = async (event: FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setError('Inserisci il titolo del libro.');
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !context) return;
    setBusy(true);
    const { error: insertError } = await supabase.from('book_listings').insert({
      seller_alias: (user.profile.display_name || user.email.split('@')[0]).slice(0, 60),
      university_id: context.universityId,
      course_name: context.courseName,
      type: form.type,
      title: title.slice(0, 200),
      author: form.author.trim().slice(0, 200),
      price: form.price ? Number(form.price) : null,
      condition: form.condition,
      notes: form.notes.trim().slice(0, 300),
      contact: form.contact.trim().slice(0, 120)
    });
    setBusy(false);
    if (insertError) {
      setError('Non è stato possibile pubblicare l’annuncio.');
      return;
    }
    setForm({ type: 'sell', title: '', author: '', price: '', condition: CONDITIONS[0], notes: '', contact: form.contact });
    setError('');
    await refresh();
    showToast('Annuncio pubblicato nel gruppo.');
  };

  const remove = async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.from('book_listings').delete().eq('id', id);
    await refresh();
  };

  return (
    <>
      {!hasExactContext ? <ContextSetup kind="books" current={context} onSave={save} /> : null}
      {hasExactContext && context ? (
        <>
          <section className="service-card">
            <div className="service-card-heading">
              <div>
                <span className="eyebrow">Gruppo compatibile</span>
                <h2>{university?.name || ''}</h2>
                <p>{context.courseName}</p>
              </div>
              <span className="valid-account-badge">Stesso ateneo + stesso corso</span>
            </div>
            {!fromProfile ? (
              <button className="text-button" type="button" onClick={reset}>
                Cambia gruppo
              </button>
            ) : null}
            <form className="service-form book-form" onSubmit={publish}>
              <label className="field">
                <span>Tipo di annuncio</span>
                <select value={form.type} onChange={(event) => update({ type: event.target.value })}>
                  <option value="sell">Vendo un libro</option>
                  <option value="buy">Cerco un libro</option>
                </select>
              </label>
              <label className="field">
                <span>Titolo</span>
                <input type="text" required value={form.title} onChange={(event) => update({ title: event.target.value })} />
              </label>
              <label className="field">
                <span>Autore</span>
                <input type="text" value={form.author} onChange={(event) => update({ author: event.target.value })} />
              </label>
              <label className="field">
                <span>
                  Prezzo € <small>(facoltativo)</small>
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => update({ price: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Condizione</span>
                <select value={form.condition} onChange={(event) => update({ condition: event.target.value })}>
                  {CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>
                  Recapito <small>(visibile agli studenti del gruppo)</small>
                </span>
                <input
                  type="text"
                  maxLength={120}
                  value={form.contact}
                  placeholder="Email, telefono o altro recapito"
                  onChange={(event) => update({ contact: event.target.value })}
                />
              </label>
              <label className="field field-wide">
                <span>Nota</span>
                <input
                  type="text"
                  placeholder="Edizione, modalità di consegna, informazioni utili"
                  value={form.notes}
                  onChange={(event) => update({ notes: event.target.value })}
                />
              </label>
              <p className="form-message field-wide" data-type={error ? 'error' : undefined}>
                {error}
              </p>
              <button className="button button-primary field-wide" type="submit" disabled={busy}>
                Pubblica l’annuncio
              </button>
            </form>
          </section>
          <section className="service-card">
            <div className="service-card-heading">
              <div>
                <span className="eyebrow">Bacheca</span>
                <h2>Annunci del tuo gruppo</h2>
              </div>
            </div>
            {listings.length ? (
              <div className="book-listing-grid">
                {listings.map((item) => (
                  <article className="book-listing-card" key={item.id}>
                    <div className="book-listing-top">
                      <span className={`book-type book-${item.type}`}>{item.type === 'sell' ? 'Vendo' : 'Cerco'}</span>
                      <strong>{item.price != null ? `€${Number(item.price).toLocaleString('it-IT')}` : 'Prezzo da concordare'}</strong>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.author || 'Autore non indicato'}</p>
                    <div className="book-details">
                      <span>{item.condition || 'Condizione non indicata'}</span>
                      <span>{item.notes || ''}</span>
                    </div>
                    {revealed === item.id ? (
                      <p className="micro-note">Recapito: {item.contact || 'non indicato dal venditore'}</p>
                    ) : null}
                    <footer>
                      <small>{item.seller_alias || 'Studente'} · account verificato</small>
                      {item.seller_id === user.id ? (
                        <button type="button" onClick={() => remove(item.id)}>
                          Elimina
                        </button>
                      ) : (
                        <button type="button" onClick={() => setRevealed(item.id)}>
                          Contatta
                        </button>
                      )}
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">Nessun annuncio per questo ateneo e corso. Puoi pubblicare il primo.</p>
            )}
          </section>
        </>
      ) : null}
      <section className="source-disclaimer">
        <strong>Mercatino tra studenti.</strong>
        <p>
          Il recapito di un annuncio è quello scelto dal venditore. Una versione pubblica richiede moderazione degli annunci,
          segnalazioni, termini di utilizzo e misure antifrode. Il sito non gestisce pagamenti.
        </p>
      </section>
    </>
  );
}
