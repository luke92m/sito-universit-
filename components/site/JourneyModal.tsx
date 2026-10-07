'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { journeyOf } from '@/lib/client/types';
import { CourseNameSelect } from './CourseNameSelect';
import { Icon } from './Icons';
import { useSite } from './SiteProvider';
import { UniversityCombobox } from './UniversityCombobox';

export function JourneyModal() {
  const { journeyModalOpen, closeJourneyEditor, user, updateProfile, showToast } = useSite();
  const [phase, setPhase] = useState<'enrolled' | 'pre-enrolling'>('enrolled');
  const [universityId, setUniversityId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [year, setYear] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!journeyModalOpen) return;
    const journey = journeyOf(user);
    setPhase(journey?.phase || 'enrolled');
    setUniversityId(journey?.universityId || '');
    setCourseName(journey?.courseName || '');
    setYear(journey?.year ? String(journey.year) : '');
    setMessage('');
    document.body.classList.add('modal-open');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeJourneyEditor();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKey);
    };
  }, [journeyModalOpen, user, closeJourneyEditor]);

  if (!journeyModalOpen || !user) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!universityId) {
      setMessage('Indica lo stato del percorso e seleziona un ateneo.');
      return;
    }
    if (phase === 'enrolled' && !year) {
      setMessage('Indica in quale anno di studi ti trovi.');
      return;
    }
    setBusy(true);
    const ok = await updateProfile({
      journey_phase: phase,
      university_id: universityId,
      course_name: courseName || null,
      study_year: phase === 'enrolled' ? Number(year) : null
    });
    setBusy(false);
    if (!ok) {
      setMessage('Non è stato possibile salvare i dati.');
      return;
    }
    closeJourneyEditor();
    showToast('Dati del percorso aggiornati.');
  }

  return (
    <div className="auth-modal" aria-hidden="false">
      <div className="modal-backdrop" onClick={closeJourneyEditor} />
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="journeyModalTitle">
        <button className="modal-close" type="button" onClick={closeJourneyEditor} aria-label="Chiudi">
          <Icon name="close" />
        </button>
        <div className="auth-heading">
          <span className="eyebrow">Profilo universitario</span>
          <h2 id="journeyModalTitle">Modifica i dati del percorso</h2>
          <p>Queste informazioni sono salvate nel tuo profilo e personalizzano scadenze, community e libri usati.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <fieldset className="compact-radio-fieldset">
            <legend>A che punto sei?</legend>
            <div className="compact-radio-row">
              <label className="choice-pill">
                <input type="radio" checked={phase === 'enrolled'} onChange={() => setPhase('enrolled')} />
                <span>Già immatricolato</span>
              </label>
              <label className="choice-pill">
                <input type="radio" checked={phase === 'pre-enrolling'} onChange={() => setPhase('pre-enrolling')} />
                <span>Mi sto per immatricolare</span>
              </label>
            </div>
          </fieldset>
          <label className="field">
            <span>Ateneo</span>
            <UniversityCombobox
              value={universityId}
              ariaLabel="Ateneo"
              onChange={(id) => {
                setUniversityId(id);
                setCourseName('');
              }}
            />
          </label>
          <label className="field">
            <span>
              Corso di studio <small>(facoltativo)</small>
            </span>
            <CourseNameSelect universityId={universityId} value={courseName} onChange={setCourseName} />
          </label>
          {phase === 'enrolled' ? (
            <label className="field">
              <span>Anno di studi</span>
              <select value={year} onChange={(event) => setYear(event.target.value)}>
                <option value="">Seleziona l’anno</option>
                <option value="1">1° anno</option>
                <option value="2">2° anno</option>
                <option value="3">3° anno</option>
                <option value="4">4° anno</option>
                <option value="5">5° anno</option>
                <option value="6">6° anno o successivo</option>
              </select>
            </label>
          ) : null}
          <p className="form-message" role="alert" aria-live="polite" data-type={message ? 'error' : undefined}>
            {message}
          </p>
          <button className="button button-primary button-full" type="submit" disabled={busy}>
            Salva il percorso
          </button>
        </form>
      </section>
    </div>
  );
}
