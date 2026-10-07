'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SITE_CONFIG, formatDate } from '@/lib/site-config';

export function Footer() {
  // La data è calcolata nel browser: le pagine statiche non devono mostrare la data di build.
  const [today, setToday] = useState('');
  useEffect(() => setToday(formatDate(new Date())), []);

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
