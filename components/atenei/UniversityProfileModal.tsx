'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { UniversityCard } from '@/lib/domain/catalog';
import { categoryClass, displayCategory } from './labels';

const integerFormatter = new Intl.NumberFormat('it-IT');

export function UniversityProfileModal({ universityId, onClose }: { universityId: string; onClose: () => void }) {
  const [card, setCard] = useState<UniversityCard | null>(null);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/atenei/${encodeURIComponent(universityId)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((payload: UniversityCard) => {
        if (active) setCard(payload);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [universityId]);

  useEffect(() => {
    document.body.classList.add('has-profile-modal');
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('has-profile-modal');
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const university = card?.university;
  const ranking = card?.ranking;
  const profile = card?.profile;
  const category = university ? displayCategory(university.category) : '';
  const rankingCopy =
    !ranking || ranking.source === 'unavailable' ? 'Nessun ranking ufficiale collegato' : `${ranking.label}: ${ranking.summary}`;

  return (
    <div className="university-profile-modal">
      <button className="university-profile-backdrop" type="button" onClick={onClose} aria-label="Chiudi la scheda" />
      <section className="university-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="universityProfileTitle">
        <button ref={closeRef} className="university-profile-close" type="button" onClick={onClose} aria-label="Chiudi">
          ×
        </button>
        <div>
          {failed ? <p className="university-profile-empty">Non è stato possibile caricare la scheda. Riprova.</p> : null}
          {!card && !failed ? <p className="university-profile-empty">Caricamento della scheda…</p> : null}
          {card && university && profile ? (
            <>
              <header className="university-profile-header">
                <div>
                  <span className={`type-badge type-${categoryClass(university.category)}`}>{category}</span>
                  <p>
                    {university.city}, {university.region}
                  </p>
                  <h2 id="universityProfileTitle">{university.name}</h2>
                </div>
                <div className="university-profile-ranking">
                  <span>Ranking disponibile</span>
                  <strong>{rankingCopy}</strong>
                  <small>{ranking?.note || ''}</small>
                </div>
              </header>

              <div className="university-profile-facts">
                <article>
                  <span>Studenti censiti</span>
                  <strong>{card.students ? integerFormatter.format(card.students) : 'n.d.'}</strong>
                </article>
                <article>
                  <span>Corsi collegati</span>
                  <strong>{card.courseCount}</strong>
                </article>
                <article>
                  <span>Aree disciplinari</span>
                  <strong>{card.groupCount}</strong>
                </article>
                <article>
                  <span>Tipologia</span>
                  <strong>{category}</strong>
                </article>
              </div>

              <section className="university-profile-section">
                <span className="eyebrow">Descrizione generale</span>
                <p>{profile.overview}</p>
              </section>

              <section className="university-profile-section">
                <span className="eyebrow">Storia in breve</span>
                <p>{profile.history}</p>
              </section>

              <section className="university-profile-section">
                <span className="eyebrow">Aree più forti o rappresentative</span>
                <h3>
                  {profile.strengths.kind === 'ranking'
                    ? 'Ranking ufficiali disponibili'
                    : 'Aree con maggiore presenza nell’offerta'}
                </h3>
                {profile.strengths.rows.length ? (
                  <div className="university-strength-list">
                    {profile.strengths.rows.map((item) => (
                      <a
                        key={`${item.source}-${item.label}`}
                        className="university-strength-item"
                        href={item.url || profile.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span>{item.source}</span>
                        <strong>{item.label}</strong>
                        <small>{item.visibleRank}</small>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="university-profile-empty">Nessuna area ufficiale collegata per questo ateneo.</p>
                )}
                <p className="micro-note">
                  Quando QS o CENSIS non coprono l’area, la scheda mostra soltanto la consistenza dell’offerta MUR e la
                  dichiara come tale: non è una classifica di qualità.
                </p>
              </section>

              <footer className="university-profile-actions">
                <a className="button button-primary" href={profile.officialUrl} target="_blank" rel="noreferrer">
                  Apri il sito ufficiale
                </a>
                <Link className="button button-secondary" href="/comparison?mode=universities">
                  Confronta questo ateneo
                </Link>
              </footer>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
