'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { useSite } from '@/components/site/SiteProvider';
import type { CoursePreferences } from '@/lib/client/types';
import { QUESTIONS, rankCourses, vectorFromAnswers, type RankedCourse } from '@/lib/domain/course-catalog';

type Answers = Record<string, string | string[]>;

interface Props {
  onResult: (result: CoursePreferences | null) => void;
  onFindUniversity: (courseSlug: string) => void;
}

function CourseCard({ course, primary = false }: { course: RankedCourse; primary?: boolean }) {
  return (
    <article className={`course-result-card${primary ? ' is-primary' : ''}`}>
      <div className="course-score" aria-label={`Compatibilità ${course.score} percento`}>
        <strong>{course.score}%</strong>
        <span>compatibilità</span>
      </div>
      <div className="course-result-copy">
        <span className="course-result-group">{course.group}</span>
        <h3>{course.name}</h3>
        <p>{course.description}</p>
        <div className="course-subjects">
          {course.subjects.slice(0, primary ? 5 : 3).map((subject) => (
            <span key={subject}>{subject}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

export function CourseFinder({ onResult, onFindUniversity }: Props) {
  const { saveCoursePreferences, showToast } = useSite();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [message, setMessage] = useState('');
  const [ranked, setRanked] = useState<RankedCourse[] | null>(null);
  const [result, setResult] = useState<CoursePreferences | null>(null);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  const question = QUESTIONS[step];
  const total = QUESTIONS.length;

  const isSelected = (value: string) => {
    const answer = answers[question.id];
    return Array.isArray(answer) ? answer.includes(value) : answer === value;
  };

  const toggleOption = (value: string, checked: boolean) => {
    if (question.type === 'multiple') {
      const current = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];
      const next = checked ? [...current, value] : current.filter((item) => item !== value);
      if (next.length > (question.max || Infinity)) {
        setMessage(`Puoi scegliere al massimo ${question.max} risposte.`);
        return;
      }
      setAnswers({ ...answers, [question.id]: next });
    } else {
      setAnswers({ ...answers, [question.id]: value });
    }
    setMessage('');
  };

  const hasAnswer = () => {
    const answer = answers[question.id];
    return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
  };

  const showResult = () => {
    const vector = vectorFromAnswers(answers);
    const ranking = rankCourses(vector);
    const next: CoursePreferences = {
      answers: structuredClone(answers),
      vector,
      recommendations: ranking.slice(0, 5).map(({ slug, name, score, group }) => ({ slug, name, score, group }))
    };
    setRanked(ranking);
    setResult(next);
    setSaved(false);
    onResult(next);
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!hasAnswer()) {
      setMessage('Scegli almeno una risposta per continuare.');
      return;
    }
    if (step < total - 1) {
      setStep(step + 1);
      setMessage('');
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    showResult();
  };

  const restart = () => {
    setStep(0);
    setAnswers({});
    setRanked(null);
    setResult(null);
    onResult(null);
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const remember = async () => {
    if (!result) return;
    const ok = await saveCoursePreferences(result);
    if (!ok) {
      showToast('Non è stato possibile salvare le preferenze.');
      return;
    }
    setSaved(true);
    showToast('Preferenze salvate: verranno usate nel comparatore.');
  };

  return (
    <section className="finder-section" id="courseFinderPanel" aria-label="Questionario per trovare il corso">
      <div className="finder-layout" hidden={Boolean(ranked)}>
        <form className="quiz-card" ref={formRef} onSubmit={handleSubmit} noValidate>
          <div className="quiz-progress-block">
            <div className="quiz-progress-copy">
              <span>
                Domanda {step + 1} di {total}
              </span>
              <strong>{step === 0 ? 'Iniziamo dai tuoi interessi' : 'Stiamo costruendo il tuo profilo'}</strong>
            </div>
            <div className="quiz-progress-track" aria-hidden="true">
              <span style={{ width: `${((step + 1) / total) * 100}%` }} />
            </div>
          </div>

          <div className="quiz-question-host">
            <fieldset className="quiz-fieldset">
              <legend>{question.title}</legend>
              <p>{question.description}</p>
              <span className="quiz-selection-note">
                {question.type === 'multiple' ? `Puoi scegliere fino a ${question.max}` : 'Scegli una risposta'}
              </span>
              <div className={`quiz-options${question.type === 'multiple' ? ' is-multiple' : ''}`}>
                {question.options.map((option) => (
                  <label className={`quiz-option${isSelected(option.value) ? ' is-selected' : ''}`} key={option.value}>
                    <input
                      type={question.type === 'multiple' ? 'checkbox' : 'radio'}
                      name={question.id}
                      value={option.value}
                      checked={isSelected(option.value)}
                      onChange={(event) => toggleOption(option.value, event.target.checked)}
                    />
                    <span className="quiz-option-control" aria-hidden="true" />
                    <span className="quiz-option-copy">
                      <strong>{option.label}</strong>
                      <small>{option.hint}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <p className="form-message quiz-message" role="alert" aria-live="polite">
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
            <button className="button button-primary" type="submit">
              {step === total - 1 ? 'Scopri il risultato' : 'Continua'}
            </button>
          </div>
        </form>

        <aside className="finder-guide-card" aria-label="Come funziona il risultato">
          <span className="finder-guide-number">01</span>
          <h2>Nessuna scelta definitiva.</h2>
          <p>Il risultato serve a restringere il campo e a darti un punto di partenza da approfondire.</p>
          <ol className="finder-guide-list">
            <li>
              <span>Interessi</span>
              <strong>Cosa ti incuriosisce</strong>
            </li>
            <li>
              <span>Metodo</span>
              <strong>Come preferisci imparare</strong>
            </li>
            <li>
              <span>Contesto</span>
              <strong>Dove ti immagini</strong>
            </li>
          </ol>
          <p className="finder-guide-note">Il questionario non misura capacità, voti o probabilità di ammissione.</p>
        </aside>
      </div>

      {ranked ? (
        <section className="finder-result" ref={resultRef} aria-labelledby="finderResultTitle">
          <div className="result-heading">
            <span className="eyebrow">Il tuo punto di partenza</span>
            <h2 id="finderResultTitle">Il corso più vicino ai tuoi interessi</h2>
            <p>Il punteggio indica la compatibilità con le risposte date, non la qualità assoluta del corso.</p>
          </div>

          <div className="primary-course-result">
            <CourseCard course={ranked[0]} primary />
          </div>
          <div className="alternative-course-grid">
            {ranked.slice(1, 3).map((course) => (
              <CourseCard course={course} key={course.slug} />
            ))}
          </div>

          <div className="remember-preferences-card">
            <div>
              <span className="eyebrow">Personalizza i confronti</span>
              <h3>Ricorda queste preferenze?</h3>
              <p>
                Se accetti, il comparatore mostrerà quanto ogni corso è vicino ai tuoi interessi. Con un profilo attivo le
                preferenze sono salvate nel tuo account, altrimenti restano nel browser di questo dispositivo.
              </p>
            </div>
            <div className="remember-actions">
              <button
                className={`button button-primary${saved ? ' is-saved' : ''}`}
                type="button"
                disabled={saved}
                onClick={remember}
              >
                {saved ? 'Preferenze ricordate' : 'Ricorda queste preferenze'}
              </button>
              <Link className="button button-secondary" href="/comparison?mode=courses">
                Apri il comparatore
              </Link>
              <button className="text-button" type="button" onClick={restart}>
                Rifai il questionario
              </button>
            </div>
          </div>

          <div className="university-next-card">
            <div>
              <span className="eyebrow">Passo successivo</span>
              <h3>Ora che hai trovato il corso adatto a te, trova la tua università.</h3>
              <p>
                Il nuovo test parte dal corso più compatibile e considera residenza, pendolarismo, trasferimento, ISEE,
                lingua, costi e ranking disponibili.
              </p>
            </div>
            <button className="button button-primary" type="button" onClick={() => onFindUniversity(ranked[0].slug)}>
              Trova la mia università
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
