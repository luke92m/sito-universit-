'use client';

import Link from 'next/link';
import { useSite } from '@/components/site/SiteProvider';
import { journeyOf, type SiteUser } from '@/lib/client/types';
import { JOURNEY_PHASE_LABELS } from '@/lib/site-config';

export function JourneySection({ user }: { user: SiteUser }) {
  const { getUniversity, openJourneyEditor } = useSite();
  const journey = journeyOf(user);
  const university = getUniversity(journey?.universityId);
  const isUniversityProfile = user.profile.situation === 'university';

  return (
    <>
      <section className="service-card service-card-emphasis">
        <div className="service-card-heading">
          <div>
            <span className="eyebrow">Profilo attivo</span>
            <h2>{isUniversityProfile ? 'Il tuo percorso universitario' : 'Il tuo percorso di orientamento'}</h2>
          </div>
          <span className="valid-account-badge">Account verificato</span>
        </div>
        {isUniversityProfile ? (
          <>
            <div className="journey-summary-grid">
              <article>
                <span>Stato</span>
                <strong>{(journey && JOURNEY_PHASE_LABELS[journey.phase]) || 'Da completare'}</strong>
              </article>
              <article>
                <span>Ateneo</span>
                <strong>{university?.name || 'Non indicato'}</strong>
              </article>
              <article>
                <span>Corso</span>
                <strong>{journey?.courseName || 'Non indicato'}</strong>
              </article>
              <article>
                <span>Anno</span>
                <strong>{journey?.phase === 'enrolled' && journey.year ? `${journey.year}° anno` : 'Non applicabile'}</strong>
              </article>
            </div>
            <button className="button button-primary" type="button" onClick={openJourneyEditor}>
              {journey ? 'Modifica i dati' : 'Completa i dati'}
            </button>
          </>
        ) : (
          <>
            <p>
              Hai indicato che vuoi iscriverti all’università. Per te il menu principale mostra anche{' '}
              <strong>Burocrazia</strong>.
            </p>
            <div className="journey-quick-links">
              <Link className="button button-primary" href="/trova-corso">
                Trova la tua università
              </Link>
              <Link className="button button-secondary" href="/burocrazia">
                Apri Burocrazia
              </Link>
            </div>
          </>
        )}
      </section>
      <section className="service-card data-privacy-card">
        <span className="eyebrow">Dati e privacy</span>
        <h2>Che cosa viene salvato?</h2>
        <p>
          Profilo, percorso, preferenze e borse salvate sono conservati nel database del sito e associati al tuo account.
          Solo tu puoi vedere e modificare i tuoi dati personali.{' '}
          <Link href="/privacy">Leggi l’informativa privacy</Link>.
        </p>
      </section>
    </>
  );
}
