'use client';

import Link from 'next/link';
import { useSite } from '@/components/site/SiteProvider';

interface Props {
  reason: 'login' | 'profile';
  loginTitle: string;
  profileTitle: string;
  loginCopy: string;
  profileCopy: string;
  eyebrow?: string;
  secondary?: { href: string; label: string };
}

/** Schermata mostrata quando uno strumento richiede accesso o un profilo specifico. */
export function AccessGate({
  reason,
  loginTitle,
  profileTitle,
  loginCopy,
  profileCopy,
  eyebrow = 'Accesso personalizzato',
  secondary = { href: '/trova-corso', label: 'Trova il mio corso' }
}: Props) {
  const { openAuth } = useSite();
  return (
    <section className="access-gate">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{reason === 'login' ? loginTitle : profileTitle}</h1>
      <p>{reason === 'login' ? loginCopy : profileCopy}</p>
      <div className="inline-actions">
        {reason === 'login' ? (
          <button className="button button-primary" type="button" onClick={() => openAuth('register')}>
            Accedi o registrati
          </button>
        ) : null}
        <Link className="button button-secondary" href={secondary.href}>
          {secondary.label}
        </Link>
      </div>
    </section>
  );
}

export function LoadingGate() {
  return (
    <section className="access-gate">
      <span className="eyebrow">Accesso personalizzato</span>
      <p>Caricamento del profilo…</p>
    </section>
  );
}
