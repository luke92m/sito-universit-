'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { FinderApiResponse } from '@/app/api/finder/route';
import { useSite } from '@/components/site/SiteProvider';
import type { CoursePreferences } from '@/lib/client/types';
import { STUDENT_SERVICES } from '@/lib/data/student-services';
import { COURSES, getCourseProfile } from '@/lib/domain/course-catalog';
import { getIseeRange, normalizedIseeValue } from '@/lib/domain/isee';
import { UniversityResultCard } from './UniversityResultCard';

const STEPS = ['course', 'degree', 'residence', 'commute', 'relocation', 'isee', 'language'] as const;
type Step = (typeof STEPS)[number];

const STEP_TITLES: Record<Step, string> = {
  course: 'Partiamo dal corso o dalla macroarea',
  degree: 'Definiamo il tipo di laurea',
  residence: 'Valutiamo la tua posizione geografica',
  commute: 'Consideriamo il pendolarismo',
  relocation: 'Capiremo quanto lontano cercare',
  isee: 'Mettiamo i costi in prospettiva',
  language: 'Completiamo con la lingua del corso'
};

const DEGREE_LABELS: Record<string, string> = {
  bachelor: 'Laurea triennale',
  single: 'Laurea magistrale a ciclo unico',
  master: 'Laurea magistrale biennale',
  undecided: 'Non l’ho ancora deciso'
};

interface Answers {
  courseChoice: string;
  degree: string;
  residenceRegion: string;
  residenceCity: string;
  commute: string;
  relocation: string;
  iseeRange: string;
  language: string;
}

type Option = { value: string; label: string; hint: string };

const GROUPS = Array.from(new Set(COURSES.map((course) => course.group))).sort((a, b) => a.localeCompare(b, 'it'));
const COURSES_BY_NAME = COURSES.slice().sort((a, b) => a.name.localeCompare(b.name, 'it'));

function OptionCards({
  name,
  options,
  selected,
  onSelect
}: {
  name: string;
  options: Option[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="quiz-options">
      {options.map((option) => (
        <label className={`quiz-option${selected === option.value ? ' is-selected' : ''}`} key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={selected === option.value}
            onChange={() => onSelect(option.value)}
          />
          <span className="quiz-option-control" aria-hidden="true" />
          <span className="quiz-option-copy">
            <strong>{option.label}</strong>
            <small>{option.hint}</small>
          </span>
        </label>
      ))}
    </div>
  );
}

interface Props {
  /** Corso suggerito dal primo test, se si arriva da lì. */
  startCourseSlug: string;
  /** Cambia a ogni nuovo avvio del test, per reimpostare le risposte. */
  startToken: number;
  currentCourseResult: CoursePreferences | null;
  onBackToCourse: () => void;
}

export function UniversityFinder({ startCourseSlug, startToken, currentCourseResult, onBackToCourse }: Props) {
  const { guidance, updateGuidance, coursePreferences } = useSite();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    courseChoice: '',
    degree: '',
    residenceRegion: '',
    residenceCity: '',
    commute: '',
    relocation: '',
    iseeRange: '',
    language: ''
  });
  const [residenceEditing, setResidenceEditing] = useState(true);
  const [iseeEditing, setIseeEditing] = useState(true);
  const [message, setMessage] = useState('');
  const [includeTelematic, setIncludeTelematic] = useState(false);
  const [includeDistance, setIncludeDistance] = useState(false);
  const [response, setResponse] = useState<FinderApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  // Corsi emersi dal test appena svolto o dalle preferenze salvate.
  const savedChoices = useMemo(() => {
    const items: { slug: string; name: string; score: number | null }[] = [];
    const seen = new Set<string>();
    const add = (item: { slug?: string; score?: number }) => {
      const profile = getCourseProfile(item?.slug);
      if (!profile || seen.has(profile.slug)) return;
      seen.add(profile.slug);
      items.push({ slug: profile.slug, name: profile.name, score: Number(item?.score) || null });
    };
    currentCourseResult?.recommendations?.forEach(add);
    coursePreferences?.recommendations?.forEach(add);
    return items;
  }, [currentCourseResult, coursePreferences]);

  // Reimposta il questionario a ogni avvio, riusando i dati già noti (porting di profileDefaults()).
  useEffect(() => {
    const savedSlug = coursePreferences?.recommendations?.find((item) => getCourseProfile(item.slug))?.slug || '';
    const choice = startCourseSlug
      ? `course:${startCourseSlug}`
      : guidance.lastCourseChoice || (savedSlug ? `course:${savedSlug}` : '');
    const defaults: Answers = {
      courseChoice: choice,
      degree: guidance.preferredDegree || '',
      residenceRegion: guidance.residenceRegion || '',
      residenceCity: guidance.residenceCity || '',
      commute: guidance.commutePreference || '',
      relocation: guidance.relocationScope || '',
      iseeRange: normalizedIseeValue(guidance.iseeRange || ''),
      language: guidance.languagePreference || ''
    };
    setAnswers(defaults);
    setResidenceEditing(!(defaults.residenceRegion && defaults.residenceCity));
    setIseeEditing(!defaults.iseeRange);
    setStep(0);
    setMessage('');
    setResponse(null);
    setIncludeTelematic(false);
    setIncludeDistance(false);
    // Solo all'avvio: i dati del profilo arrivati dopo non devono sovrascrivere le risposte in corso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startToken]);

  const key = STEPS[step];
  const set = (patch: Partial<Answers>) => setAnswers((current) => ({ ...current, ...patch }));

  const validate = (): string => {
    if (key === 'course' && !answers.courseChoice) return 'Seleziona un corso o una macroarea.';
    if (key === 'degree' && !answers.degree) return 'Seleziona il tipo di laurea che vuoi ottenere.';
    if (key === 'residence' && (!answers.residenceRegion || !answers.residenceCity.trim()))
      return 'Indica regione e città di residenza.';
    if (key === 'commute' && !answers.commute) return 'Indica se puoi fare il pendolare.';
    if (key === 'relocation' && !answers.relocation) return 'Indica la tua disponibilità a trasferirti.';
    if (key === 'isee' && !answers.iseeRange)
      return 'Seleziona una fascia ISEE oppure “non conosco ancora il mio ISEE”.';
    if (key === 'language' && !answers.language) return 'Indica la lingua preferita.';
    return '';
  };

  async function loadResults(options: { includeTelematic: boolean; includeDistance: boolean }, scroll: boolean) {
    setLoading(true);
    try {
      const res = await fetch('/api/finder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers: { ...answers, residenceCity: answers.residenceCity.trim() }, ...options })
      });
      const payload = await res.json();
      if (!res.ok) {
        setMessage(payload.error || 'Non è stato possibile calcolare i risultati.');
        return;
      }
      setResponse(payload as FinderApiResponse);
      if (scroll) window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } catch {
      setMessage('Non è stato possibile calcolare i risultati. Controlla la connessione e riprova.');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      setMessage(error);
      return;
    }
    setMessage('');
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    await updateGuidance({
      residenceRegion: answers.residenceRegion,
      residenceCity: answers.residenceCity.trim(),
      iseeRange: answers.iseeRange,
      preferredDegree: answers.degree,
      commutePreference: answers.commute,
      relocationScope: answers.relocation,
      languagePreference: answers.language,
      lastCourseChoice: answers.courseChoice,
      lastUniversityFinderAt: new Date().toISOString()
    });
    setIncludeTelematic(false);
    setIncludeDistance(false);
    await loadResults({ includeTelematic: false, includeDistance: false }, true);
  };

  const restart = () => {
    setStep(0);
    setResponse(null);
    setMessage('');
    setResidenceEditing(!(answers.residenceRegion && answers.residenceCity));
    setIseeEditing(!answers.iseeRange);
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const iseeRange = getIseeRange(answers.iseeRange);
  const residenceConfirmed = Boolean(answers.residenceRegion && answers.residenceCity && !residenceEditing);
  const iseeConfirmed = Boolean(iseeRange && !iseeEditing);
  const nextLabel =
    step === STEPS.length - 1
      ? 'Trova la mia università'
      : (key === 'residence' && residenceConfirmed) || (key === 'isee' && iseeConfirmed)
        ? 'Conferma e continua'
        : 'Continua';

  let question: React.ReactNode = null;
  if (key === 'course') {
    const savedSlugs = new Set(savedChoices.map((item) => item.slug));
    question = (
      <fieldset className="quiz-fieldset university-question-fieldset">
        <legend>Quale corso o macroarea ti interessa?</legend>
        <p>Questa scelta determina quali università e quali percorsi verranno analizzati.</p>
        {savedChoices.length ? (
          <div className="finder-prefill-note">
            <span>Preferenze disponibili</span>
            <strong>Puoi eseguire il test con uno qualunque dei {savedChoices.length} corsi emersi o salvati.</strong>
          </div>
        ) : (
          <div className="finder-prefill-note is-neutral">
            <span>Nessun test precedente necessario</span>
            <strong>Scegli direttamente un corso generale oppure una macroarea.</strong>
          </div>
        )}
        <label className="field university-course-select-field">
          <span>Corso o macroarea</span>
          <select value={answers.courseChoice} onChange={(event) => set({ courseChoice: event.target.value })}>
            <option value="">Seleziona un corso o una macroarea</option>
            {savedChoices.length ? (
              <optgroup label="Corsi emersi dalle tue preferenze">
                {savedChoices.map((item) => (
                  <option key={item.slug} value={`course:${item.slug}`}>
                    {item.name}
                    {item.score ? ` — ${item.score}%` : ''}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label="Tutti i corsi generali">
              {COURSES_BY_NAME.filter((course) => !savedSlugs.has(course.slug)).map((course) => (
                <option key={course.slug} value={`course:${course.slug}`}>
                  {course.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Macroaree">
              {GROUPS.map((group) => (
                <option key={group} value={`group:${group}`}>
                  {group}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      </fieldset>
    );
  } else if (key === 'degree') {
    question = (
      <fieldset className="quiz-fieldset university-question-fieldset">
        <legend>Quale titolo vuoi ottenere?</legend>
        <p>Il sito controllerà che l’ateneo offra un percorso coerente con il livello scelto.</p>
        <OptionCards
          name="universityDegree"
          selected={answers.degree}
          onSelect={(degree) => set({ degree })}
          options={[
            { value: 'bachelor', label: 'Laurea triennale', hint: 'Il primo percorso universitario, normalmente di tre anni.' },
            {
              value: 'single',
              label: 'Laurea a ciclo unico',
              hint: 'Percorsi come medicina, giurisprudenza, veterinaria o architettura.'
            },
            { value: 'master', label: 'Laurea magistrale', hint: 'Un percorso biennale successivo alla laurea triennale.' },
            { value: 'undecided', label: 'Non ho ancora deciso', hint: 'Non escludere nessun livello in questa fase.' }
          ]}
        />
      </fieldset>
    );
  } else if (key === 'residence') {
    question = residenceConfirmed ? (
      <fieldset className="quiz-fieldset university-question-fieldset">
        <legend>Conferma la tua residenza.</legend>
        <p>Abbiamo trovato questi dati già inseriti nel sito. Premi “Conferma e continua” oppure modificali.</p>
        <div className="profile-confirmation-card">
          <div>
            <span>Dati già disponibili</span>
            <strong>
              {answers.residenceCity} · {answers.residenceRegion}
            </strong>
            <small>Usati soltanto per stimare distanza e possibilità di pendolarismo.</small>
          </div>
          <button className="button button-secondary" type="button" onClick={() => setResidenceEditing(true)}>
            Modifica
          </button>
        </div>
      </fieldset>
    ) : (
      <fieldset className="quiz-fieldset university-question-fieldset">
        <legend>Dove risiedi?</legend>
        <p>
          Regione e città permettono di stimare quali sedi potresti raggiungere con un treno regionale in meno di un’ora e
          mezza.
        </p>
        <div className="university-inline-fields">
          <label className="field">
            <span>Regione di residenza</span>
            <select value={answers.residenceRegion} onChange={(event) => set({ residenceRegion: event.target.value })}>
              <option value="">Seleziona</option>
              {STUDENT_SERVICES.regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Comune o città</span>
            <input
              type="text"
              value={answers.residenceCity}
              placeholder="Es. Pavia"
              onChange={(event) => set({ residenceCity: event.target.value })}
            />
          </label>
        </div>
        <p className="service-form-note">
          La raggiungibilità ferroviaria è una stima del prototipo: prima di scegliere dovrai controllare orari, cambi e
          stazione effettiva.
        </p>
      </fieldset>
    );
  } else if (key === 'commute') {
    question = (
      <fieldset className="quiz-fieldset university-question-fieldset">
        <legend>Prenderesti in considerazione il pendolarismo?</legend>
        <p>
          Per pendolarismo intendiamo una percorrenza stimata entro 90 minuti usando treni regionali o regionali veloci,
          senza alta velocità.
        </p>
        <OptionCards
          name="universityCommute"
          selected={answers.commute}
          onSelect={(commute) => set({ commute })}
          options={[
            {
              value: 'yes',
              label: 'Sì, posso fare il pendolare',
              hint: 'Considera solo regionali e regionali veloci entro 1 ora e 30 minuti. Nel punteggio vale quanto un trasferimento compatibile.'
            },
            {
              value: 'no',
              label: 'No, preferisco evitare',
              hint: 'Mostra sedi nella mia città o opzioni compatibili con il trasferimento. I corsi a distanza restano esclusi salvo tua scelta nei risultati.'
            }
          ]}
        />
        <p className="service-form-note">
          Restare nella città di residenza riceve un piccolo vantaggio. Fare il pendolare o trasferirsi, quando entrambe le
          opzioni sono compatibili con le tue risposte, hanno invece lo stesso peso geografico.
        </p>
      </fieldset>
    );
  } else if (key === 'relocation') {
    question = (
      <fieldset className="quiz-fieldset university-question-fieldset">
        <legend>Se necessario, quanto lontano potresti trasferirti?</legend>
        <p>La risposta amplia o restringe l’area in cui cercare le università.</p>
        <OptionCards
          name="universityRelocation"
          selected={answers.relocation}
          onSelect={(relocation) => set({ relocation })}
          options={[
            {
              value: 'none',
              label: 'Non voglio trasferirmi',
              hint: 'Restano soltanto sedi locali o raggiungibili con regionali entro 90 minuti, se hai accettato il pendolarismo.'
            },
            { value: 'region', label: 'Nella mia regione', hint: 'Posso cambiare città, ma restando nella stessa regione.' },
            {
              value: 'neighbors',
              label: 'Anche in regioni confinanti',
              hint: 'Valuta la mia regione e quelle direttamente confinanti.'
            },
            { value: 'italy', label: 'In tutta Italia', hint: 'La distanza non deve escludere un’università molto adatta.' }
          ]}
        />
      </fieldset>
    );
  } else if (key === 'isee') {
    question = iseeConfirmed ? (
      <fieldset className="quiz-fieldset university-question-fieldset">
        <legend>Conferma la tua fascia ISEE.</legend>
        <p>Abbiamo trovato una fascia già usata nel sito. Serve soltanto per pesare costi e possibilità di agevolazione.</p>
        <div className="profile-confirmation-card">
          <div>
            <span>Fascia già disponibile</span>
            <strong>{iseeRange?.label}</strong>
            <small>L’ISEE non viene trattato come reddito disponibile: è usato come indicatore orientativo.</small>
          </div>
          <button className="button button-secondary" type="button" onClick={() => setIseeEditing(true)}>
            Modifica
          </button>
        </div>
      </fieldset>
    ) : (
      <fieldset className="quiz-fieldset university-question-fieldset">
        <legend>Qual è la tua fascia ISEE universitaria?</legend>
        <p>Il sito confronterà in modo orientativo retta, costo della città e presenza di borse o esoneri.</p>
        <label className="field university-course-select-field">
          <span>Fascia ISEE</span>
          <select value={answers.iseeRange} onChange={(event) => set({ iseeRange: event.target.value })}>
            <option value="">Seleziona</option>
            {STUDENT_SERVICES.iseeRanges.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <p className="service-form-note">
          Puoi scegliere “Non conosco ancora il mio ISEE”. Con un profilo attivo il dato è salvato nel tuo account,
          altrimenti resta su questo dispositivo.
        </p>
      </fieldset>
    );
  } else {
    question = (
      <fieldset className="quiz-fieldset university-question-fieldset">
        <legend>In quale lingua preferisci studiare?</legend>
        <p>Quando la lingua può essere ricavata dall’offerta formativa, verrà usata nel punteggio.</p>
        <OptionCards
          name="universityLanguage"
          selected={answers.language}
          onSelect={(language) => set({ language })}
          options={[
            { value: 'italian', label: 'Italiano', hint: 'Privilegia i percorsi indicati in lingua italiana.' },
            { value: 'english', label: 'Inglese', hint: 'Privilegia i percorsi il cui titolo o scheda indica l’inglese.' },
            { value: 'either', label: 'Indifferente', hint: 'La lingua non modifica il punteggio finale.' }
          ]}
        />
      </fieldset>
    );
  }

  const results = response?.results || [];
  const visible = results.slice(0, 5);
  const target = response?.target;
  const courseLabel = target ? (target.type === 'course' ? `corso ${target.label}` : `area ${target.label}`) : '';

  const toggle = (next: { includeTelematic: boolean; includeDistance: boolean }) => {
    setIncludeTelematic(next.includeTelematic);
    setIncludeDistance(next.includeDistance);
    loadResults(next, false);
  };

  return (
    <section
      className="finder-section university-finder-panel"
      id="universityFinderPanel"
      ref={panelRef}
      aria-labelledby="universityFinderTitle"
    >
      <div className="university-finder-intro">
        <div>
          <span className="eyebrow">Orientamento tra gli atenei</span>
          <h2 id="universityFinderTitle">
            Trova l’università
            <br />
            più adatta a te.
          </h2>
          <p>
            Puoi partire da uno dei corsi salvati nelle tue preferenze oppure scegliere direttamente un corso o una
            macroarea, anche senza aver svolto il primo test.
          </p>
        </div>
        <button className="text-button" type="button" onClick={onBackToCourse}>
          Torna al test sul corso
        </button>
      </div>

      <div className="finder-layout university-finder-layout" hidden={Boolean(response)}>
        <form className="quiz-card" ref={formRef} onSubmit={handleSubmit} noValidate>
          <div className="quiz-progress-block">
            <div className="quiz-progress-copy">
              <span>
                Domanda {step + 1} di {STEPS.length}
              </span>
              <strong>{STEP_TITLES[key]}</strong>
            </div>
            <div className="quiz-progress-track" aria-hidden="true">
              <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>

          <div className="quiz-question-host">{question}</div>
          <p className="form-message quiz-message" role="alert" aria-live="polite" data-type={message ? 'error' : undefined}>
            {message}
          </p>

          <div className="quiz-actions">
            <button
              className="button button-secondary"
              type="button"
              disabled={step === 0}
              onClick={() => {
                setStep(step - 1);
                setMessage('');
              }}
            >
              Indietro
            </button>
            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? 'Calcolo in corso…' : nextLabel}
            </button>
          </div>
        </form>

        <aside className="finder-guide-card university-guide-card" aria-label="Come vengono ordinate le università">
          <span className="finder-guide-number">02</span>
          <h2>Una lista breve, non un verdetto.</h2>
          <p>
            Il punteggio serve a restringere la ricerca. Ogni dato importante deve poi essere controllato sulle pagine
            ufficiali.
          </p>
          <ol className="finder-guide-list">
            <li>
              <span>Corso</span>
              <strong>Presenza e coerenza del percorso</strong>
            </li>
            <li>
              <span>Geografia</span>
              <strong>Stessa città, regionali entro 90 minuti o trasferimento</strong>
            </li>
            <li>
              <span>Economia</span>
              <strong>Retta, città, ISEE e sostegni</strong>
            </li>
            <li>
              <span>Qualità</span>
              <strong>QS per materia 2026, con fallback dichiarato</strong>
            </li>
          </ol>
          <p className="finder-guide-note">
            Il pendolarismo considera soltanto regionali e regionali veloci, senza alta velocità, entro 90 minuti stimati.
            Pendolarismo e trasferimento compatibili hanno lo stesso peso; restare nella propria città ha un piccolo
            vantaggio. I corsi a distanza e gli atenei telematici sono esclusi di default; puoi includerli soltanto dai
            risultati. I tempi e i costi restano stime dimostrative.
          </p>
        </aside>
      </div>

      {response ? (
        <section className="university-finder-result" ref={resultRef} aria-labelledby="universityResultTitle">
          <div className="result-heading">
            <span className="eyebrow">Risultato personalizzato</span>
            <h2 id="universityResultTitle">Le università più adatte al tuo profilo.</h2>
            <p>
              Classifica per {courseLabel}, {DEGREE_LABELS[answers.degree] || ''}, residenza a {answers.residenceCity.trim()}{' '}
              e preferenze economiche e geografiche indicate.
            </p>
            <div className="result-method-note">
              <strong>{visible.length} opzioni principali</strong>
              <span>
                Corso 30% · geografia 18% · ranking QS per materia 25% · sostenibilità 18% · lingua 4% · borse 5%. Nella
                città di residenza: geografia 20% e ranking 23%.
              </span>
            </div>
            <div className="university-result-controls">
              <label className="university-telematic-toggle" htmlFor="includeTelematicResults">
                <input
                  id="includeTelematicResults"
                  type="checkbox"
                  checked={includeTelematic}
                  disabled={loading}
                  onChange={(event) => toggle({ includeTelematic: event.target.checked, includeDistance })}
                />
                <span className="university-toggle-control" aria-hidden="true">
                  <span />
                </span>
                <span className="university-toggle-copy">
                  <strong>Considera anche le università telematiche</strong>
                  <small>
                    {includeTelematic
                      ? 'Attivato. Gli atenei telematici e i loro corsi online partecipano alla classifica.'
                      : 'Disattivato di default.'}
                  </small>
                </span>
              </label>
              <label className="university-telematic-toggle" htmlFor="includeDistanceResults">
                <input
                  id="includeDistanceResults"
                  type="checkbox"
                  checked={includeDistance}
                  disabled={loading}
                  onChange={(event) => toggle({ includeTelematic, includeDistance: event.target.checked })}
                />
                <span className="university-toggle-control" aria-hidden="true">
                  <span />
                </span>
                <span className="university-toggle-copy">
                  <strong>Considera anche i corsi a distanza</strong>
                  <small>
                    {includeDistance
                      ? 'Attivato. Possono essere scelti corsi online offerti anche da atenei tradizionali.'
                      : 'Disattivato di default, separatamente dal filtro sugli atenei telematici.'}
                  </small>
                </span>
              </label>
            </div>
          </div>

          <div className="university-result-list">
            {visible.length ? (
              <>
                {visible.map((item, index) => (
                  <UniversityResultCard key={`${item.university.id}-${item.course.id}`} item={item} index={index} />
                ))}
                {results.length > 5 ? (
                  <details className="university-extended-ranking">
                    <summary>Mostra la classifica sintetica fino a 30 università</summary>
                    <div className="university-extended-list">
                      {results.map((item, index) => (
                        <article className="university-extended-row" key={`${item.university.id}-${item.course.id}`}>
                          <span className="university-extended-position">{index + 1}</span>
                          <div>
                            <strong>{item.university.name}</strong>
                            <small>
                              {item.course.name} · {item.course.city || item.university.city}
                            </small>
                          </div>
                          <span className="university-extended-match">
                            {item.courseMatch.label} · {item.courseMatch.score}
                          </span>
                          <span className="university-extended-ranking-copy">{item.rankingText}</span>
                          <strong className="university-extended-score">{item.total}%</strong>
                        </article>
                      ))}
                    </div>
                  </details>
                ) : null}
              </>
            ) : (
              <div className="university-no-results">
                <span className="eyebrow">Nessuna corrispondenza sufficiente</span>
                <h3>
                  {response.telematicOnly
                    ? 'Le opzioni disponibili sono telematiche.'
                    : 'Le preferenze geografiche sono troppo restrittive per il corso scelto.'}
                </h3>
                <p>
                  {response.telematicOnly
                    ? 'Attiva l’opzione qui sopra per includerle nella classifica.'
                    : 'Torna indietro e prova a consentire il trasferimento in regioni confinanti o in tutta Italia.'}
                </p>
              </div>
            )}
          </div>
          <div className="university-result-footer">
            <button className="button button-primary" type="button" onClick={restart}>
              Modifica le risposte
            </button>
            <Link className="button button-secondary" href="/comparison">
              Apri il comparatore
            </Link>
          </div>
        </section>
      ) : null}
    </section>
  );
}
