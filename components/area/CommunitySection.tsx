'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { useSite } from '@/components/site/SiteProvider';
import type { SiteUser } from '@/lib/client/types';
import { useLoader } from '@/lib/client/use-loader';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/site-config';
import { ContextSetup, useGroupContext } from './GroupContext';

interface Message {
  id: string;
  author_id: string;
  author_alias: string;
  university_id: string;
  course_name: string;
  body: string;
  created_at: string;
}

const NO_MESSAGES: Message[] = [];

function normalize(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

export function CommunitySection({ user }: { user: SiteUser }) {
  const { getUniversity, showToast } = useSite();
  const { context, save, reset, fromProfile } = useGroupContext(user, 'community');
  const [sameCourse, setSameCourse] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadMessages = useCallback(async (): Promise<Message[]> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !context) return [];
    const { data } = await supabase
      .from('community_messages')
      .select('id, author_id, author_alias, university_id, course_name, body, created_at')
      .eq('university_id', context.universityId)
      .order('created_at', { ascending: false })
      .limit(200);
    return (data as Message[]) || [];
  }, [context]);
  const [messages, refresh] = useLoader(loadMessages, NO_MESSAGES);

  if (context === undefined) return <p className="empty-state">Caricamento del gruppo…</p>;

  const university = context ? getUniversity(context.universityId) : null;
  const visible = messages.filter(
    (message) => !sameCourse || (context?.courseName && normalize(message.course_name) === normalize(context.courseName))
  );

  const publish = async (event: FormEvent) => {
    event.preventDefault();
    const body = text.trim();
    if (!body) {
      setError('Scrivi un messaggio prima di pubblicare.');
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !context) return;
    setBusy(true);
    const { error: insertError } = await supabase.from('community_messages').insert({
      author_alias: (user.profile.display_name || user.email.split('@')[0]).slice(0, 60),
      university_id: context.universityId,
      course_name: context.courseName || '',
      body: body.slice(0, 800)
    });
    setBusy(false);
    if (insertError) {
      setError('Non è stato possibile pubblicare il messaggio.');
      return;
    }
    setText('');
    setError('');
    refresh();
    showToast('Messaggio pubblicato nel gruppo.');
  };

  const remove = async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.from('community_messages').delete().eq('id', id);
    refresh();
  };

  return (
    <>
      {!context ? <ContextSetup kind="community" current={null} onSave={save} /> : null}
      {context ? (
        <section className="service-card community-card">
          <div className="service-card-heading">
            <div>
              <span className="eyebrow">Gruppo verificato dal profilo</span>
              <h2>{university?.name || 'Community'}</h2>
              <p>{context.courseName || 'Tutti i corsi'}</p>
            </div>
            <span className="valid-account-badge">Account verificato</span>
          </div>
          <div className="community-toolbar">
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={sameCourse}
                disabled={!context.courseName}
                onChange={(event) => setSameCourse(event.target.checked)}
              />
              <span>Mostra solo lo stesso corso</span>
            </label>
            {!fromProfile ? (
              <button className="text-button" type="button" onClick={reset}>
                Cambia gruppo
              </button>
            ) : null}
          </div>
          <div className="community-message-list">
            {visible.length ? (
              visible.map((message) => (
                <article className="community-message" key={message.id}>
                  <div className="community-avatar">{(message.author_alias || 'S').charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="community-message-meta">
                      <strong>{message.author_alias || 'Studente'}</strong>
                      <span>{message.author_id === user.id ? 'Tu' : 'Account verificato'}</span>
                      <time dateTime={message.created_at}>
                        {formatDate(message.created_at, { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                    <p>{message.body}</p>
                    <small>{message.course_name || 'Gruppo generale dell’ateneo'}</small>
                    {message.author_id === user.id ? (
                      <button className="text-button" type="button" onClick={() => remove(message.id)}>
                        Elimina
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="community-empty">
                <strong>Ancora nessun messaggio in questo gruppo.</strong>
                <p>Puoi essere il primo a iniziare una conversazione.</p>
              </div>
            )}
          </div>
          <form className="community-compose" onSubmit={publish}>
            <label htmlFor="communityText">Scrivi nel gruppo</label>
            <textarea
              id="communityText"
              rows={3}
              maxLength={800}
              placeholder="Fai una domanda o condividi un’informazione utile…"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <p className="form-message" data-type={error ? 'error' : undefined}>
              {error}
            </p>
            <button className="button button-primary" type="submit" disabled={busy}>
              Pubblica
            </button>
          </form>
        </section>
      ) : null}
      <section className="source-disclaimer">
        <strong>Community in fase di avvio.</strong>
        <p>
          I messaggi sono visibili agli utenti registrati. Prima dell’apertura al pubblico servono regole di condotta,
          segnalazioni e strumenti di moderazione.
        </p>
      </section>
    </>
  );
}
