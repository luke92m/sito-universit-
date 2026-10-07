'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SITUATION_LABELS } from '@/lib/site-config';
import { CourseNameSelect } from './CourseNameSelect';
import { Icon } from './Icons';
import { useSite } from './SiteProvider';
import { UniversityCombobox } from './UniversityCombobox';

type Message = { text: string; type: 'error' | 'success' } | null;

const HEADINGS = {
  login: {
    eyebrow: 'Bentornato',
    title: 'Accedi al tuo profilo',
    description: 'Ritrova gli strumenti e le informazioni che ti interessano.'
  },
  register: {
    eyebrow: 'Inizia da qui',
    title: 'Crea il tuo profilo',
    description: 'Dicci in quale momento del percorso ti trovi: personalizzeremo menu e strumenti.'
  },
  reset: {
    eyebrow: 'Recupero accesso',
    title: 'Reimposta la password',
    description: 'Ti invieremo un link per scegliere una nuova password.'
  }
};

function authErrorMessage(message: string): string {
  const text = message.toLowerCase();
  if (text.includes('invalid login credentials')) return 'Email o password non corretti.';
  if (text.includes('email not confirmed')) return 'Conferma prima il tuo indirizzo email: controlla la posta in arrivo.';
  if (text.includes('already registered') || text.includes('already been registered'))
    return 'Esiste già un profilo con questa email. Prova ad accedere.';
  if (text.includes('rate limit')) return 'Troppi tentativi ravvicinati. Riprova tra qualche minuto.';
  if (text.includes('password')) return 'La password non rispetta i requisiti minimi (almeno 8 caratteri).';
  return 'Operazione non riuscita. Riprova tra poco.';
}

function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
}

type AuthView = 'login' | 'register' | 'reset';

export function AuthModal() {
  const { authModal } = useSite();
  // Il dialogo viene smontato alla chiusura: i campi ripartono vuoti a ogni apertura.
  return authModal ? <AuthDialog view={authModal} /> : null;
}

function AuthDialog({ view: authModal }: { view: AuthView }) {
  const { openAuth, closeAuth, showToast, authAvailable, universities } = useSite();
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);

  // Stato del form di registrazione
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [situation, setSituation] = useState('');
  const [phase, setPhase] = useState<'enrolled' | 'pre-enrolling'>('enrolled');
  const [universityId, setUniversityId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [studyYear, setStudyYear] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  useEffect(() => {
    document.body.classList.add('modal-open');
    const timer = window.setTimeout(() => firstInput.current?.focus(), 30);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAuth();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKey);
    };
  }, [authModal, closeAuth]);

  const heading = HEADINGS[authModal];
  const supabase = getSupabaseBrowserClient();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setSituation('');
    setPhase('enrolled');
    setUniversityId('');
    setCourseName('');
    setStudyYear('');
    setAgeConfirmed(false);
    setPrivacyAccepted(false);
  };

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) {
      setMessage({ text: 'Inserisci email e password.', type: 'error' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    setBusy(false);
    if (error) {
      setMessage({ text: authErrorMessage(error.message), type: 'error' });
      return;
    }
    resetForm();
    closeAuth();
    showToast('Accesso effettuato. Bentornato!');
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
      setMessage({ text: 'Inserisci un indirizzo email valido.', type: 'error' });
      return;
    }
    if (password.length < 8) {
      setMessage({ text: 'La password deve contenere almeno 8 caratteri.', type: 'error' });
      return;
    }
    if (!SITUATION_LABELS[situation]) {
      setMessage({ text: 'Seleziona la situazione che ti rappresenta.', type: 'error' });
      return;
    }
    if (situation === 'university') {
      if (!universityId) {
        setMessage({ text: 'Seleziona l’ateneo del tuo percorso.', type: 'error' });
        return;
      }
      if (phase === 'enrolled' && !studyYear) {
        setMessage({ text: 'Indica in quale anno di studi ti trovi.', type: 'error' });
        return;
      }
    }
    if (!ageConfirmed) {
      setMessage({ text: 'Per registrarti devi avere almeno 14 anni.', type: 'error' });
      return;
    }
    if (!privacyAccepted) {
      setMessage({ text: 'Conferma di aver letto l’informativa privacy.', type: 'error' });
      return;
    }

    const journey =
      situation === 'university'
        ? {
            journey_phase: phase,
            university_id: universityId,
            course_name: courseName,
            study_year: phase === 'enrolled' ? studyYear : ''
          }
        : {};

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: {
        emailRedirectTo: `${siteOrigin()}/auth/callback?next=/`,
        data: { situation, ...journey, age_confirmed: true, privacy_accepted: true }
      }
    });
    setBusy(false);
    if (error) {
      setMessage({ text: authErrorMessage(error.message), type: 'error' });
      return;
    }
    // Con la conferma email attiva Supabase non restituisce identità per indirizzi già registrati.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setMessage({ text: 'Esiste già un profilo con questa email. Prova ad accedere.', type: 'error' });
      return;
    }
    resetForm();
    if (data.session) {
      closeAuth();
      showToast('Profilo creato con successo.');
      return;
    }
    setMessage({
      text: 'Ti abbiamo inviato un’email: apri il link di conferma per attivare il profilo.',
      type: 'success'
    });
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setMessage({ text: 'Inserisci l’email del tuo profilo.', type: 'error' });
      return;
    }
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: `${siteOrigin()}/auth/callback?next=/reimposta-password`
    });
    setBusy(false);
    // Risposta identica anche se l'email non esiste, per non rivelare quali account sono registrati.
    setMessage({ text: 'Se l’email è registrata, riceverai a breve il link per reimpostare la password.', type: 'success' });
  }

  const switchView = (view: AuthView) => {
    setMessage(null);
    openAuth(view);
  };

  return (
    <div className="auth-modal" aria-hidden="false">
      <div className="modal-backdrop" onClick={closeAuth} />
      <section className="auth-dialog auth-dialog-large" role="dialog" aria-modal="true" aria-labelledby="authTitle">
        <button className="modal-close" type="button" onClick={closeAuth} aria-label="Chiudi">
          <Icon name="close" />
        </button>

        <div className="auth-heading">
          <span className="eyebrow">{heading.eyebrow}</span>
          <h2 id="authTitle">{heading.title}</h2>
          <p>{heading.description}</p>
        </div>

        {!authAvailable ? (
          <p className="form-message" data-type="error" role="alert">
            Account non ancora attivi: il database del sito non è configurato (variabili Supabase mancanti).
          </p>
        ) : null}

        {authModal === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin} noValidate>
            <label className="field">
              <span>Email</span>
              <input
                ref={firstInput}
                type="email"
                autoComplete="email"
                placeholder="nome@email.it"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="La tua password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <p className="form-message" role="alert" aria-live="polite" data-type={message?.type}>
              {message?.text}
            </p>
            <button className="button button-primary button-full" type="submit" disabled={busy || !authAvailable}>
              Accedi <Icon name="arrow" />
            </button>
            <p className="auth-switch">
              <button type="button" onClick={() => switchView('reset')}>
                Password dimenticata?
              </button>
            </p>
            <p className="auth-switch">
              Non hai ancora un profilo?{' '}
              <button type="button" onClick={() => switchView('register')}>
                Registrati
              </button>
            </p>
          </form>
        ) : null}

        {authModal === 'reset' ? (
          <form className="auth-form" onSubmit={handleReset} noValidate>
            <label className="field">
              <span>Email</span>
              <input
                ref={firstInput}
                type="email"
                autoComplete="email"
                placeholder="nome@email.it"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <p className="form-message" role="alert" aria-live="polite" data-type={message?.type}>
              {message?.text}
            </p>
            <button className="button button-primary button-full" type="submit" disabled={busy || !authAvailable}>
              Invia il link <Icon name="arrow" />
            </button>
            <p className="auth-switch">
              Ricordi la password?{' '}
              <button type="button" onClick={() => switchView('login')}>
                Accedi
              </button>
            </p>
          </form>
        ) : null}

        {authModal === 'register' ? (
          <form className="auth-form" onSubmit={handleRegister} noValidate>
            <label className="field">
              <span>Email</span>
              <input
                ref={firstInput}
                type="email"
                autoComplete="email"
                placeholder="nome@email.it"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Almeno 8 caratteri"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <fieldset className="situation-fieldset">
              <legend>Qual è la tua situazione?</legend>
              {Object.entries(SITUATION_LABELS).map(([value, label]) => (
                <label className="situation-option" key={value}>
                  <input
                    type="radio"
                    name="situation"
                    value={value}
                    required
                    checked={situation === value}
                    onChange={() => setSituation(value)}
                  />
                  <span className="radio-ui" aria-hidden="true" />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>

            {situation === 'university' ? (
              <section className="journey-form-panel">
                <div className="journey-form-heading">
                  <strong>Il tuo percorso universitario</strong>
                  <small>Questi dati rendono utili scadenze, community e libri usati.</small>
                </div>

                <fieldset className="compact-radio-fieldset">
                  <legend>A che punto sei?</legend>
                  <div className="compact-radio-row">
                    <label className="choice-pill">
                      <input type="radio" checked={phase === 'enrolled'} onChange={() => setPhase('enrolled')} />
                      <span>Già immatricolato</span>
                    </label>
                    <label className="choice-pill">
                      <input
                        type="radio"
                        checked={phase === 'pre-enrolling'}
                        onChange={() => setPhase('pre-enrolling')}
                      />
                      <span>Mi sto per immatricolare</span>
                    </label>
                  </div>
                </fieldset>

                <label className="field">
                  <span>Ateneo</span>
                  <UniversityCombobox
                    value={universityId}
                    options={universities}
                    ariaLabel="Ateneo"
                    onChange={(id) => {
                      setUniversityId(id);
                      setCourseName('');
                    }}
                  />
                </label>

                <label className="field">
                  <span>
                    Corso di studio <small>(facoltativo, ma necessario per i libri usati)</small>
                  </span>
                  <CourseNameSelect universityId={universityId} value={courseName} onChange={setCourseName} />
                </label>

                {phase === 'enrolled' ? (
                  <label className="field">
                    <span>Anno di studi</span>
                    <select value={studyYear} onChange={(event) => setStudyYear(event.target.value)}>
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
              </section>
            ) : null}

            <label className="toggle-row consent-row">
              <input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} />
              <span>Ho almeno 14 anni.</span>
            </label>
            <label className="toggle-row consent-row">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(event) => setPrivacyAccepted(event.target.checked)}
              />
              <span>
                Ho letto l’
                <Link href="/privacy" target="_blank">
                  informativa privacy
                </Link>
                .
              </span>
            </label>

            <p className="form-message" role="alert" aria-live="polite" data-type={message?.type}>
              {message?.text}
            </p>
            <button className="button button-primary button-full" type="submit" disabled={busy || !authAvailable}>
              Crea il profilo <Icon name="arrow" />
            </button>
            <p className="privacy-note">Riceverai un’email per confermare l’indirizzo prima del primo accesso.</p>
            <p className="auth-switch">
              Hai già un profilo?{' '}
              <button type="button" onClick={() => switchView('login')}>
                Accedi
              </button>
            </p>
          </form>
        ) : null}
      </section>
    </div>
  );
}
