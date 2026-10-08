import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Link non valido', robots: { index: false } };

export default function AuthErrorPage() {
  return (
    <main className="legal-page">
      <article>
        <span className="eyebrow">Accesso</span>
        <h1>Il link non è più valido.</h1>
        <p className="page-lead">
          I link di conferma e di reimpostazione della password scadono dopo poco tempo o dopo il primo utilizzo. Torna
          alla homepage e accedi, oppure richiedi un nuovo link da “Password dimenticata?”.
        </p>
        <Link className="button button-primary" href="/">
          Torna alla homepage
        </Link>
      </article>
    </main>
  );
}
