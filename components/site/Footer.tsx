'use client';

import Link from 'next/link';
import { useToday } from '@/lib/client/use-today';
import { SITE_CONFIG } from '@/lib/site-config';

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
          Un punto di partenza semplice per orientarsi nel mondo universitario. <Link href="/privacy">Privacy</Link>
        </p>
        <span className="footer-status">{today ? `Oggi ${today}` : ''}</span>
      </div>
    </footer>
  );
}
