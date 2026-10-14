'use client';

import Link from 'next/link';
import { useToday } from '@/lib/client/use-today';
import { NEUTRALITY_TEXT, SITE_CONFIG } from '@/lib/site-config';

export function Footer() {
  const today = useToday();

  return (
    <footer className="site-footer">
      <div className="footer-shell">
        <Link className="footer-brand" href="/">
          <span className="brand-mark small" aria-hidden="true">
            u
          </span>
          <span>{SITE_CONFIG.name}</span>
        </Link>
        <p>
          {NEUTRALITY_TEXT} <Link href="/burocrazia">Come iscriversi</Link> · <Link href="/metodo">Come calcoliamo i costi</Link> ·{' '}
          <Link href="/privacy">Privacy</Link>
        </p>
        <span className="footer-status">{today ? `Oggi ${today}` : ''}</span>
      </div>
    </footer>
  );
}
