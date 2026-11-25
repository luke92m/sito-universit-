'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useToday } from '@/lib/client/use-today';
import { NEUTRALITY_TEXT, SITE_CONFIG, visibleNavItems } from '@/lib/site-config';
import { BrandMark } from './Header';

// Footer a colonne (tasteskill, footer-columns). Sulla home la prima riga è la chiusura "close-word":
// titolo e pulsante principale, poi il nome del sito steso sulla larghezza della pagina.
export function Footer() {
  const today = useToday();
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <footer className={`site-footer${isHome ? ' is-closing closing' : ''}`}>
      <div className="footer-shell wrap">
        {isHome ? (
          <div className="footer-close">
            <div className="footer-close__head">
              <h2>
                Trova l’università che fa per te. <span className="footer-muted">Sei domande, nessun account.</span>
              </h2>
              <Link className="footer-close__btn" href="/trova-corso">
                Trova la tua università
              </Link>
            </div>
            <p className="footer-close__word" aria-hidden="true">
              {SITE_CONFIG.name}
            </p>
          </div>
        ) : null}

        <div className="footer-directory">
          <div className="footer-brand-col">
            <Link className="footer-brand" href="/">
              <BrandMark small />
              <span>{SITE_CONFIG.name}</span>
            </Link>
            <p>{NEUTRALITY_TEXT}</p>
          </div>
          <nav className="footer-col" aria-label="Il percorso">
            <h3>Il percorso</h3>
            <ul>
              {visibleNavItems().map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav className="footer-col" aria-label="Informazioni">
            <h3>Informazioni</h3>
            <ul>
              <li>
                <Link href="/burocrazia">Come iscriversi</Link>
              </li>
              <li>
                <Link href="/metodo">Come calcoliamo i costi</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy</Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="footer-legal">
          <span>{SITE_CONFIG.name}</span>
          <span className="footer-status">{today ? `Oggi ${today}` : ''}</span>
        </div>
      </div>
    </footer>
  );
}
