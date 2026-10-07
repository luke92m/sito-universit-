'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSite } from '@/components/site/SiteProvider';
import { UniversityCombobox } from '@/components/site/UniversityCombobox';
import { journeyOf, type UniversitySummary } from '@/lib/client/types';
import { STUDENT_SERVICES } from '@/lib/data/student-services';
import { formatDate } from '@/lib/site-config';
import type { TestArea } from '@/lib/types';
import { AccessGate, LoadingGate } from './AccessGate';

type Mode = 'auto' | 'tolc' | 'internal';

function Quiz({ university, area, mode, onReset }: { university: UniversitySummary; area: TestArea; mode: 'tolc' | 'internal'; onReset: () => void }) {
  const questions = (STUDENT_SERVICES.questionBanks?.[area.id] || []).slice(0, 5);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [corrected, setCorrected] = useState(false);
  const [message, setMessage] = useState('');
  const scoreRef = useRef<HTMLDivElement>(null);
  const testLabel =
    mode === 'tolc' ? `${area.tolc} — schema orientativo` : `Test interno di ${area.label.toLowerCase()} — simulazione orientativa`;

  const score = questions.reduce((sum, question, index) => sum + (answers[index] === question.answer ? 1 : 0), 0);
  const percentage = Math.round((score / Math.max(1, questions.length)) * 100);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const unanswered = answers.filter((answer) => answer === null).length;
    if (unanswered) {
      setMessage(`Rispondi ancora a ${unanswered} ${unanswered === 1 ? 'domanda' : 'domande'}.`);
      return;
    }
    setMessage('');
    setCorrected(true);
    window.setTimeout(() => scoreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  };

  return (
    <>
      <section className="service-card preparation-quiz-card">
        <div className="quiz-context-bar">
          <div>
            <span>{university.shortName || university.name}</span>
            <strong>{testLabel}</strong>
          </div>
          <button className="button button-quiet" type="button" onClick={onReset}>
            Cambia impostazioni
          </button>
        </div>
        <form className="fixed-question-list" onSubmit={submit} noValidate>
          {questions.map((question, questionIndex) => (
            <fieldset className="fixed-question" key={question.question}>
              <legend>
                <span>{String(questionIndex + 1).padStart(2, '0')}</span>
                <div>
                  <small>{question.section}</small>
                  {question.question}
                </div>
              </legend>
              <div className="fixed-answer-grid">
                {question.options.map((option, optionIndex) => {
                  const correct = corrected && optionIndex === question.answer;
                  const wrong = corrected && optionIndex === answers[questionIndex] && answers[questionIndex] !== question.answer;
                  return (
                    <label className={`fixed-answer${correct ? ' is-correct' : ''}${wrong ? ' is-wrong' : ''}`} key={option}>
                      <input
                        type="radio"
                        name={`preparationQuestion${questionIndex}`}
                        checked={answers[questionIndex] === optionIndex}
                        onChange={() =>
                          setAnswers((current) => current.map((value, index) => (index === questionIndex ? optionIndex : value)))
                        }
                      />
                      <span className="fixed-answer-letter">{String.fromCharCode(65 + optionIndex)}</span>
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
              {corrected ? (
                <div className="answer-explanation">
                  <strong>
                    {answers[questionIndex] === question.answer
                      ? 'Risposta corretta'
                      : `Risposta corretta: ${String.fromCharCode(65 + question.answer)}`}
                  </strong>
                  <p>{question.explanation}</p>
                </div>
              ) : null}
            </fieldset>
          ))}
          <p className="form-message" role="alert" data-type={message ? 'error' : undefined}>
            {message}
          </p>
          <button className="button button-primary" type="submit">
            Correggi la simulazione
          </button>
        </form>
      </section>
      <div ref={scoreRef}>
        {corrected ? (
          <section className="quiz-score-card">
            <div className="score-dial" style={{ '--score': percentage } as React.CSSProperties}>
              <span>{percentage}%</span>
            </div>
            <div>
              <span className="eyebrow">Risultato</span>
              <h2>{percentage >= 80 ? 'Ottima base.' : percentage >= 60 ? 'Buon punto di partenza.' : 'Continua ad allenarti.'}</h2>
              <p>
                Hai risposto correttamente a{' '}
                <strong>
                  {score} domande su {questions.length}
                </strong>
                . Le spiegazioni sono ora visibili sotto ogni quesito.
              </p>
            </div>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setAnswers(questions.map(() => null));
                setCorrected(false);
              }}
            >
              Riprova le stesse domande
            </button>
          </section>
        ) : null}
      </div>
    </>
  );
}

export function Preparation() {
  const { user, loading, getUniversity } = useSite();
  const [universityId, setUniversityId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [mode, setMode] = useState<Mode>('auto');
  const [modeTouched, setModeTouched] = useState(false);
  const [message, setMessage] = useState('');
  const [quiz, setQuiz] = useState<{ university: UniversitySummary; area: TestArea; mode: 'tolc' | 'internal'; key: number } | null>(
    null
  );
  const [today, setToday] = useState('');
  const quizRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setToday(formatDate(new Date())), []);
  useEffect(() => {
    const journeyUniversity = journeyOf(user)?.universityId;
    if (journeyUniversity) setUniversityId((current) => current || journeyUniversity);
  }, [user]);

  // Tipo di prova suggerito: TOLC per gli atenei statali, test interno per gli altri (finché l'utente non sceglie).
  useEffect(() => {
    if (!universityId || modeTouched) return;
    setMode(getUniversity(universityId)?.isPublic ? 'tolc' : 'internal');
  }, [universityId, modeTouched, getUniversity]);

  if (loading) return <LoadingGate />;
  if (!user || user.profile.situation !== 'enrolling') {
    return (
      <AccessGate
        reason={user ? 'profile' : 'login'}
        loginTitle="Accedi per usare la preparazione personalizzata."
        loginCopy="Nel profilo puoi indicare “Mi voglio iscrivere all’università” e sbloccare esercizi e strumenti di orientamento."
        profileTitle="Questa sezione è riservata a chi vuole iscriversi all’università."
        profileCopy="Puoi creare un profilo con la situazione “Mi voglio iscrivere all’università” oppure continuare a consultare Atenei, Comparison e Trova il mio corso."
      />
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const university = getUniversity(universityId);
    const area = STUDENT_SERVICES.testAreas.find((entry) => entry.id === areaId);
    if (!university || !area) {
      setMessage('Seleziona un ateneo e una macroarea.');
      return;
    }
    setMessage('');
    const effective = mode === 'auto' ? (university.isPublic ? 'tolc' : 'internal') : mode;
    setQuiz({ university, area, mode: effective, key: Date.now() });
    window.setTimeout(() => quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  return (
    <>
      <section className="tool-hero tool-hero-compact">
        <div>
          <span className="eyebrow">Preparazione personalizzata</span>
          <h1>Allenati per il test d’ingresso.</h1>
          <p>
            Seleziona ateneo e macroarea. Il sito propone una simulazione fissa e uguale per tutti gli utenti, coerente con
            il TOLC di riferimento oppure con un test interno di area.
          </p>
        </div>
        <aside className="today-card">
          <span>Data di riferimento</span>
          <strong>{today}</strong>
          <small>Controlla sempre il bando più recente dell’ateneo.</small>
        </aside>
      </section>

      <section className="tool-grid tool-grid-main">
        <article className="service-card">
          <div className="service-card-heading">
            <div>
              <span className="eyebrow">Configura la prova</span>
              <h2>Da dove vuoi partire?</h2>
            </div>
            <span className="data-year-badge">esercizi originali</span>
          </div>
          <form className="service-form" ref={formRef} onSubmit={submit} noValidate>
            <label className="field field-wide">
              <span>Ateneo che ti interessa</span>
              <UniversityCombobox value={universityId} onChange={setUniversityId} ariaLabel="Ateneo che ti interessa" required />
            </label>
            <label className="field field-wide">
              <span>Dipartimento o macroarea</span>
              <select value={areaId} onChange={(event) => setAreaId(event.target.value)} required>
                <option value="">Seleziona una macroarea</option>
                {STUDENT_SERVICES.testAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Tipo di prova indicato nel bando</span>
              <select
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value as Mode);
                  setModeTouched(true);
                }}
              >
                <option value="auto">Rilevamento orientativo</option>
                <option value="tolc">TOLC CISIA</option>
                <option value="internal">Test interno dell’ateneo</option>
              </select>
            </label>
            <label className="field">
              <span>Numero di domande</span>
              <select defaultValue="5">
                <option value="5">5 domande</option>
              </select>
            </label>
            <p className="service-form-note field-wide">
              Il prototipo non copia quesiti protetti dal web: usa un archivio originale e deterministico. Le sezioni reali,
              i tempi, le penalità e le soglie vanno verificati nel bando e sul portale CISIA.
            </p>
            <p className="form-message field-wide" role="alert" data-type={message ? 'error' : undefined}>
              {message}
            </p>
            <button className="button button-primary field-wide" type="submit">
              Crea la simulazione
            </button>
          </form>
        </article>

        <aside className="service-card info-stack-card">
          <span className="eyebrow">Come funziona</span>
          <ol className="numbered-info-list">
            <li>
              <span>01</span>
              <div>
                <strong>Seleziona l’area</strong>
                <p>Il sistema associa la macroarea al TOLC più vicino.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Svolgi gli esercizi</strong>
                <p>Le domande restano identiche per tutti gli utenti.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Leggi le spiegazioni</strong>
                <p>Il risultato evidenzia risposta corretta e ragionamento.</p>
              </div>
            </li>
          </ol>
          <a className="text-link" href={STUDENT_SERVICES.sources?.cisiaRules || '#'} target="_blank" rel="noreferrer">
            Consulta le regole TOLC ufficiali →
          </a>
        </aside>
      </section>

      <div ref={quizRef}>
        {quiz ? (
          <Quiz
            key={quiz.key}
            university={quiz.university}
            area={quiz.area}
            mode={quiz.mode}
            onReset={() => {
              setQuiz(null);
              formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        ) : null}
      </div>

      <section className="source-disclaimer">
        <strong>Strumento di allenamento, non simulatore ufficiale.</strong>
        <p>
          Il test effettivo può cambiare per ateneo, corso e anno accademico. Prima di prepararti, apri il bando del corso e
          verifica struttura, iscrizione e scadenze.
        </p>
      </section>
    </>
  );
}
