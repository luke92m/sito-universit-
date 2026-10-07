'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useSite } from '@/components/site/SiteProvider';
import { SECTION_META, type SectionKey } from '@/lib/area-sections';
import { SITE_CONFIG, formatDate } from '@/lib/site-config';

export type { SectionKey };


const TABS: [SectionKey, string][] = [
  ['dati-percorso', 'Dati del percorso'],
  ['borse-di-studio', 'Borse di studio'],
  ['scadenze', 'Scadenze'],
  ['community', 'Community'],
  ['accompagnamento', 'Accompagnamento'],
  ['libri-usati', 'Libri usati']
];

export function AreaLocked({ reason }: { reason: 'login' | 'profile' }) {
  const { openAuth } = useSite();
  return (
    <section className="student-area-locked">
      <span className="eyebrow">Area personale</span>
      <h1>
        {reason === 'profile'
          ? 'Questa area è riservata a studenti e futuri studenti.'
          : 'Accedi per aprire la tua area personale.'}
      </h1>
      <p>
        {reason === 'profile'
          ? 'Il profilo “mi interessa il mondo universitario” può usare atenei, orientamento e comparatore, ma non gli strumenti personali.'
          : 'Registrazione e accesso sono necessari per associare promemoria e preferenze al tuo profilo.'}
      </p>
      <button className="button button-primary" type="button" onClick={() => openAuth(reason === 'profile' ? 'register' : 'login')}>
        {reason === 'profile' ? 'Modifica o crea un altro profilo' : 'Accedi o registrati'}
      </button>
    </section>
  );
}

export function AreaShell({ section, children }: { section: SectionKey; children: ReactNode }) {
  const meta = SECTION_META[section];
  const [today, setToday] = useState('');
  useEffect(() => {
    setToday(formatDate(new Date()));
    document.title = `${meta.title} — ${SITE_CONFIG.name}`;
  }, [meta.title]);

  return (
    <>
      <section className="student-area-hero">
        <div>
          <span className="eyebrow">{meta.eyebrow}</span>
          <h1>{meta.title}</h1>
          <p className="page-lead">{meta.lead}</p>
        </div>
        <aside className="today-card" aria-label="Data di riferimento">
          <span>Data di riferimento</span>
          <strong>{today}</strong>
          <small>I conteggi temporali si ricalcolano automaticamente.</small>
        </aside>
      </section>
      <nav className="student-area-tabs" aria-label="Sezioni del profilo">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/area-studente/${key}`}
            className={section === key ? 'is-active' : ''}
            aria-current={section === key ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="student-area-content">{children}</div>
    </>
  );
}
