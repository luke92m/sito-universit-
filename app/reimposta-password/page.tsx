'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useSite } from '@/components/site/SiteProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const { user, loading, showToast } = useSite();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    if (password.length < 8) {
      setMessage({ text: 'La password deve contenere almeno 8 caratteri.', type: 'error' });
      return;
    }
    if (password !== confirm) {
      setMessage({ text: 'Le due password non coincidono.', type: 'error' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage({ text: 'Non è stato possibile aggiornare la password. Richiedi un nuovo link.', type: 'error' });
      return;
    }
    setPassword('');
    setConfirm('');
    setMessage({ text: 'Password aggiornata.', type: 'success' });
    showToast('Password aggiornata.');
  }

  return (
    <main className="legal-page">
      <article>
        <span className="eyebrow">Recupero accesso</span>
        <h1>Scegli una nuova password</h1>
        {loading ? <p>Verifica del link in corso…</p> : null}
        {!loading && !user ? (
          <p className="page-lead">
            Il link non è valido o è scaduto. <Link href="/">Torna alla homepage</Link> e richiedi un nuovo link da
            “Password dimenticata?”.
          </p>
        ) : null}
        {user ? (
          <form className="auth-form" onSubmit={handleSubmit} noValidate style={{ maxWidth: 420 }}>
            <label className="field">
              <span>Nuova password</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Ripeti la password</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </label>
            <p className="form-message" role="alert" data-type={message?.type}>
              {message?.text}
            </p>
            <button className="button button-primary" type="submit" disabled={busy}>
              Salva la password
            </button>
          </form>
        ) : null}
      </article>
    </main>
  );
}
