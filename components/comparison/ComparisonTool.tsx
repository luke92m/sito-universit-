'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { RichText } from '@/components/site/RichText';
import { useSite } from '@/components/site/SiteProvider';
import { UniversityCombobox } from '@/components/site/UniversityCombobox';
import type { UniversitySummary } from '@/lib/client/types';
import { useUniversityCourses, type CourseOption } from '@/lib/client/use-courses';
import type { ComparisonResult, ComparisonValue } from '@/lib/domain/comparison';
import { matchCourse } from '@/lib/domain/course-catalog';

type Mode = 'universities' | 'courses';

interface Props {
  universities: UniversitySummary[];
  universitiesWithCourses: UniversitySummary[];
  defaults: {
    leftId: string;
    rightId: string;
    courseLeftUniversityId: string;
    courseRightUniversityId: string;
    courseLeftId: string;
    courseRightId: string;
  };
  initialMode: Mode;
}

const LEVEL_LABELS: Record<string, string> = {
  triennale: 'laurea',
  magistrale: 'magistrale',
  'ciclo-unico': 'ciclo unico',
  altro: 'corso'
};

function courseLabel(course: CourseOption): string {
  const suffix = [course.classCode, LEVEL_LABELS[course.level]].filter(Boolean).join(' · ');
  return `${course.name}${suffix ? ` — ${suffix}` : ''}`;
}

/** Corsi dell'ateneo con il corso scelto che segue il profilo generale ricordato (es. Economia aziendale). */
function CoursePicker({
  universityId,
  value,
  onChange,
  preferredSlug,
  id
}: {
  universityId: string;
  value: string;
  onChange: (courseId: string, profileSlug: string) => void;
  preferredSlug: string;
  id: string;
}) {
  const { courses, loading } = useUniversityCourses(universityId);
  const sorted = useMemo(
    () => courses.slice().sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })),
    [courses]
  );

  // Al cambio di ateneo seleziona il corso coerente con il profilo ricordato, altrimenti il primo.
  useEffect(() => {
    if (loading || !sorted.length) return;
    if (sorted.some((course) => course.id === value)) return;
    const preferred = preferredSlug ? sorted.find((course) => matchCourse(course)?.slug === preferredSlug) : null;
    const next = preferred || sorted[0];
    onChange(next.id, matchCourse(next)?.slug || '');
  }, [sorted, loading, value, preferredSlug, onChange]);

  if (!loading && !sorted.length) {
    return (
      <select id={id} disabled>
        <option value="">Nessun corso di laurea nel dataset collegato</option>
      </select>
    );
  }

  return (
    <select
      id={id}
      value={value}
      disabled={loading}
      onChange={(event) => {
        const course = sorted.find((item) => item.id === event.target.value);
        onChange(event.target.value, course ? matchCourse(course)?.slug || '' : '');
      }}
    >
      {loading ? <option value={value}>Caricamento dei corsi…</option> : null}
      {sorted.map((course) => (
        <option key={course.id} value={course.id}>
          {courseLabel(course)}
        </option>
      ))}
    </select>
  );
}

function ValueBlock({ value }: { value: ComparisonValue }) {
  return (
    <div className="comparison-value">
      <strong>
        <RichText value={value.value} />
      </strong>
      {value.note.length ? (
        <small>
          <RichText value={value.note} />
        </small>
      ) : null}
      {value.tag ? (
        <span className={`comparison-source-tag${value.tag === 'Da integrare' ? ' is-pending' : ''}`}>{value.tag}</span>
      ) : null}
    </div>
  );
}

export function ComparisonTool({ universities, universitiesWithCourses, defaults, initialMode }: Props) {
  const { coursePreferences, forgetCoursePreferences, showToast } = useSite();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [leftId, setLeftId] = useState(defaults.leftId);
  const [rightId, setRightId] = useState(defaults.rightId);
  const [courseUniversityA, setCourseUniversityA] = useState(defaults.courseLeftUniversityId);
  const [courseUniversityB, setCourseUniversityB] = useState(defaults.courseRightUniversityId);
  const [courseA, setCourseA] = useState({ id: defaults.courseLeftId, slug: 'economia-aziendale' });
  const [courseB, setCourseB] = useState({ id: defaults.courseRightId, slug: 'economia-aziendale' });
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [busy, setBusy] = useState(false);
  const resultRef = useRef<HTMLElement>(null);

  const changeMode = (next: Mode) => {
    setMode(next);
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', next);
    window.history.replaceState({}, '', url);
  };

  async function compare(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch('/api/comparison', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        showToast(data.error || 'Confronto non disponibile.');
        return;
      }
      setResult(data as ComparisonResult);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } catch {
      showToast('Confronto non disponibile: controlla la connessione.');
    } finally {
      setBusy(false);
    }
  }

  const submitUniversities = (event: FormEvent) => {
    event.preventDefault();
    if (!leftId || !rightId) return;
    if (leftId === rightId) {
      showToast('Scegli due università diverse.');
      return;
    }
    compare({ mode: 'universities', leftId, rightId });
  };

  const submitCourses = (event: FormEvent) => {
    event.preventDefault();
    if (!courseUniversityA || !courseUniversityB || !courseA.id || !courseB.id) return;
    if (courseUniversityA === courseUniversityB && courseA.id === courseB.id) {
      showToast('Scegli due corsi diversi.');
      return;
    }
    compare({
      mode: 'courses',
      leftId: courseUniversityA,
      leftCourseId: courseA.id,
      rightId: courseUniversityB,
      rightCourseId: courseB.id,
      vector: coursePreferences?.vector || null
    });
  };

  const top = coursePreferences?.recommendations?.[0];

  return (
    <section className="comparison-section" aria-label="Comparatore universitario">
      <div className="comparison-mode-switch" role="tablist" aria-label="Tipo di confronto">
        {(
          [
            ['universities', 'Due università'],
            ['courses', 'Due corsi']
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={`comparison-mode-button${mode === key ? ' is-active' : ''}`}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => changeMode(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="comparison-preference-status">
        {top ? (
          <>
            <div>
              <span className="preference-status-icon">✓</span>
              <p>
                <strong>Preferenze attive:</strong> {top.name} ({top.score}%). Saranno usate nei confronti tra corsi.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await forgetCoursePreferences();
                setResult(null);
                showToast('Preferenze rimosse.');
              }}
            >
              Dimentica
            </button>
          </>
        ) : (
          <>
            <div>
              <span className="preference-status-icon">?</span>
              <p>
                <strong>Nessuna preferenza salvata.</strong> Nel confronto tra corsi il parametro “interesse personale”
                verrà ignorato.
              </p>
            </div>
            <Link href="/trova-corso">Fai il questionario</Link>
          </>
        )}
      </div>

      {mode === 'universities' ? (
        <form className="comparison-picker" onSubmit={submitUniversities}>
          <div className="comparison-choice-card">
            <span className="choice-letter">A</span>
            <label htmlFor="universityA">Prima università</label>
            <UniversityCombobox id="universityA" value={leftId} onChange={setLeftId} options={universities} ariaLabel="Prima università" />
          </div>
          <div className="comparison-divider" aria-hidden="true">
            <span>VS</span>
          </div>
          <div className="comparison-choice-card">
            <span className="choice-letter">B</span>
            <label htmlFor="universityB">Seconda università</label>
            <UniversityCombobox
              id="universityB"
              value={rightId}
              onChange={setRightId}
              options={universities}
              ariaLabel="Seconda università"
            />
          </div>
          <button className="button button-primary comparison-submit" type="submit" disabled={busy}>
            Confronta gli atenei
          </button>
        </form>
      ) : (
        <form className="comparison-picker course-picker" onSubmit={submitCourses}>
          <div className="comparison-choice-card">
            <span className="choice-letter">A</span>
            <label htmlFor="courseUniversityA">Università</label>
            <UniversityCombobox
              id="courseUniversityA"
              value={courseUniversityA}
              onChange={(id) => {
                setCourseUniversityA(id);
                setCourseA((current) => ({ id: '', slug: current.slug }));
              }}
              options={universitiesWithCourses}
              ariaLabel="Università del primo corso"
            />
            <label htmlFor="courseA">Corso</label>
            <CoursePicker
              id="courseA"
              universityId={courseUniversityA}
              value={courseA.id}
              preferredSlug={courseA.slug}
              onChange={(id, slug) => setCourseA({ id, slug })}
            />
          </div>
          <div className="comparison-divider" aria-hidden="true">
            <span>VS</span>
          </div>
          <div className="comparison-choice-card">
            <span className="choice-letter">B</span>
            <label htmlFor="courseUniversityB">Università</label>
            <UniversityCombobox
              id="courseUniversityB"
              value={courseUniversityB}
              onChange={(id) => {
                setCourseUniversityB(id);
                setCourseB((current) => ({ id: '', slug: current.slug }));
              }}
              options={universitiesWithCourses}
              ariaLabel="Università del secondo corso"
            />
            <label htmlFor="courseB">Corso</label>
            <CoursePicker
              id="courseB"
              universityId={courseUniversityB}
              value={courseB.id}
              preferredSlug={courseB.slug}
              onChange={(id, slug) => setCourseB({ id, slug })}
            />
          </div>
          <button className="button button-primary comparison-submit" type="submit" disabled={busy}>
            Confronta i corsi
          </button>
        </form>
      )}

      <section className="comparison-results" ref={resultRef} aria-live="polite">
        {result ? (
          <>
            <div className="comparison-result-heading">
              <div>
                {result.scenario ? <span className="scenario-label">{result.scenario}</span> : null}
                <h2>{result.title}</h2>
                <p>{result.description}</p>
              </div>
              <button className="comparison-print-button" type="button" onClick={() => window.print()}>
                Stampa / salva PDF
              </button>
            </div>
            <div className="comparison-table" role="table" aria-label={result.title}>
              <div className="comparison-row comparison-table-head" role="row">
                <div role="columnheader">Criterio</div>
                <div role="columnheader">
                  <span>A</span>
                  {result.leftTitle}
                </div>
                <div role="columnheader">
                  <span>B</span>
                  {result.rightTitle}
                </div>
              </div>
              {result.rows.map((row) => (
                <div className="comparison-row" role="row" key={row.label}>
                  <div className="comparison-criterion" role="rowheader">
                    <strong>{row.label}</strong>
                    {row.hint ? <small>{row.hint}</small> : null}
                  </div>
                  <div role="cell">
                    <ValueBlock value={row.left} />
                  </div>
                  <div role="cell">
                    <ValueBlock value={row.right} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <div className="comparison-data-note">
        <strong>Come leggere questo prototipo.</strong>
        <p>
          I corsi, l’accesso, la modalità didattica, le contribuzioni, gli esoneri, le borse, la mobilità e le strutture
          derivano dai dati MUR. Per i corsi viene privilegiato il QS per materia; in sua assenza viene usato il CENSIS
          della didattica e, se non disponibile, il CENSIS generale nella categoria omogenea dell’ateneo. Costi urbani e
          affitti usano ISTAT e Immobiliare.it Insights; la qualità della vita giovanile usa Il Sole 24 Ore. Quando manca
          una percentuale omogenea del singolo corso, il sito mostra un indicatore ufficiale chiaramente qualificato
          oppure conduce alla scheda dell’ateneo, senza generare dati fittizi.
        </p>
      </div>
    </section>
  );
}
