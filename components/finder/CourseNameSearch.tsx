'use client';

import { useEffect, useId, useState } from 'react';

interface CourseNameHit {
  name: string;
  universities: number;
  group: string;
  levels: string[];
}

const LEVEL_LABELS: Record<string, string> = {
  triennale: 'triennale',
  magistrale: 'magistrale',
  'ciclo-unico': 'ciclo unico'
};

const count = (value: number) => (value === 1 ? '1 ateneo' : `${value} atenei`);

/** Ricerca di un corso reale per nome (dataset MUR): per chi sa già quale corso vuole. */
export function CourseNameSearch({ selected, onPick }: { selected: string; onPick: (name: string) => void }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<{ query: string; results: CourseNameHit[] }>({ query: '', results: [] });
  const wanted = query.trim();

  useEffect(() => {
    if (wanted.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/course-names?q=${encodeURIComponent(wanted)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((payload) => setState({ query: wanted, results: Array.isArray(payload.results) ? payload.results : [] }))
        .catch(() => undefined);
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [wanted]);

  const ready = wanted.length >= 2 && state.query === wanted;
  const results = ready ? state.results : [];

  return (
    <div className="course-name-search">
      <label className="field university-course-select-field" htmlFor={`${id}-q`}>
        <span>Oppure cerca il nome preciso di un corso</span>
        <input
          id={`${id}-q`}
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Es. Informatica per il management…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p className="course-name-search-status" aria-live="polite">
        {ready ? (results.length ? `${results.length} corsi trovati` : 'Nessun corso con queste parole nel dataset MUR.') : ''}
      </p>
      {results.length ? (
        <ul className="course-name-search-results">
          {results.map((hit) => {
            const active = selected === hit.name;
            return (
              <li key={hit.name}>
                <button
                  type="button"
                  className={active ? 'is-selected' : undefined}
                  aria-pressed={active}
                  onClick={() => onPick(hit.name)}
                >
                  <strong>{hit.name}</strong>
                  <small>
                    {count(hit.universities)} · {hit.levels.map((level) => LEVEL_LABELS[level] || level).join(', ')} ·{' '}
                    {hit.group}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
