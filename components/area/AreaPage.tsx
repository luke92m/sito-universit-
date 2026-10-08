'use client';

import Link from 'next/link';
import { LoadingGate } from '@/components/tools/AccessGate';
import { useSite } from '@/components/site/SiteProvider';
import type { SiteUser } from '@/lib/client/types';
import { AreaLocked, AreaShell, type SectionKey } from './AreaShell';
import { BooksSection } from './BooksSection';
import { CommunitySection } from './CommunitySection';
import { DeadlinesSection } from './DeadlinesSection';
import { JourneySection } from './JourneySection';
import { ScholarshipsSection } from './ScholarshipsSection';

function Accompaniment({ user }: { user: SiteUser }) {
  const items: [string, string, string][] =
    user.profile.situation === 'enrolling'
      ? [
          ['Scopri', 'Completa “Trova il mio corso” e salva le preferenze utili al comparatore.', '/trova-corso'],
          ['Confronta', 'Metti a confronto atenei e corsi usando criteri accademici ed economici.', '/comparison'],
          ['Preparati', 'Svolgi esercizi originali coerenti con la macroarea e con il TOLC di riferimento.', '/preparazione'],
          ['Organizza', 'Apri Burocrazia, controlla il bando e salva le scadenze reali.', '/burocrazia']
        ]
      : [
          ['Aggiorna', 'Mantieni corretti ateneo, corso e anno nel tuo profilo.', '/area-studente/dati-percorso'],
          ['Controlla', 'Consulta rate, esami e procedure nella sezione Scadenze.', '/area-studente/scadenze'],
          ['Cerca', 'Verifica borse di studio e salva quelle da approfondire.', '/area-studente/borse-di-studio'],
          ['Confrontati', 'Usa community e libri usati nel gruppo corretto.', '/area-studente/community']
        ];
  return (
    <>
      <section className="service-card accompaniment-card">
        <span className="eyebrow">Prossimi passi</span>
        <h2>Un percorso semplice, una fase alla volta</h2>
        <div className="accompaniment-list">
          {items.map(([title, copy, href], index) => (
            <Link href={href} className="accompaniment-step" key={title}>
              <span>0{index + 1}</span>
              <div>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
              <b>→</b>
            </Link>
          ))}
        </div>
      </section>
      <section className="source-disclaimer">
        <strong>Non sostituisce segreteria, bando o tutor ufficiale.</strong>
        <p>
          Usa questo spazio per ordinare le informazioni, poi verifica sempre requisiti e procedure sui canali dell’ateneo.
        </p>
      </section>
    </>
  );
}

export function AreaPage({ section }: { section: SectionKey }) {
  const { user, loading, isStudentToolUser } = useSite();
  if (loading) return <LoadingGate />;
  if (!user) return <AreaLocked reason="login" />;
  if (!isStudentToolUser) return <AreaLocked reason="profile" />;

  return (
    <AreaShell section={section}>
      {section === 'dati-percorso' ? <JourneySection user={user} /> : null}
      {section === 'borse-di-studio' ? <ScholarshipsSection user={user} /> : null}
      {section === 'scadenze' ? <DeadlinesSection user={user} /> : null}
      {section === 'community' ? <CommunitySection user={user} /> : null}
      {section === 'libri-usati' ? <BooksSection user={user} /> : null}
      {section === 'accompagnamento' ? <Accompaniment user={user} /> : null}
    </AreaShell>
  );
}
