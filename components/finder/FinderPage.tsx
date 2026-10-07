'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSite } from '@/components/site/SiteProvider';
import type { CoursePreferences } from '@/lib/client/types';
import { CourseFinder } from './CourseFinder';
import { UniversityFinder } from './UniversityFinder';

type Mode = 'course' | 'university';

export function FinderPage() {
  const { coursePreferences } = useSite();
  const [mode, setMode] = useState<Mode>('course');
  const [courseResult, setCourseResult] = useState<CoursePreferences | null>(null);
  const [universityStart, setUniversityStart] = useState({ slug: '', token: 0 });
  const universityRef = useRef<HTMLDivElement>(null);
  const courseRef = useRef<HTMLDivElement>(null);

  const switchMode = (next: Mode, options: { courseSlug?: string; instant?: boolean } = {}) => {
    setMode(next);
    const behavior: ScrollBehavior = options.instant ? 'auto' : 'smooth';
    if (next === 'university') {
      setUniversityStart((current) => ({ slug: options.courseSlug || '', token: current.token + 1 }));
      window.setTimeout(() => universityRef.current?.scrollIntoView({ behavior, block: 'start' }), 0);
      try {
        history.replaceState(null, '', '#trova-universita');
      } catch {
        // Nessuna azione necessaria.
      }
    } else {
      window.setTimeout(() => courseRef.current?.scrollIntoView({ behavior, block: 'start' }), 0);
      try {
        history.replaceState(null, '', location.pathname + location.search);
      } catch {
        // Nessuna azione necessaria.
      }
    }
  };

  // Accesso diretto al secondo test: /trova-corso#trova-universita oppure ?mode=university
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.hash === '#trova-universita' || params.get('mode') === 'university') {
      switchMode('university', { instant: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const top = coursePreferences?.recommendations?.[0];

  return (
    <>
      <section className="page-hero compact finder-page-hero" aria-labelledby="finderTitle">
        <span className="eyebrow">Orientamento personale</span>
        <h1 id="finderTitle">
          Trova un corso
          <br />
          che ti somiglia.
        </h1>
        <p className="page-lead">
          Rispondi a sei domande sui tuoi interessi. Alla fine riceverai un suggerimento generale, non legato a un ateneo
          specifico.
        </p>
        {top ? (
          <div className="saved-preference-banner">
            <div>
              <span>Preferenze già salvate</span>
              <strong>
                {top.name} · {top.score}%
              </strong>
            </div>
            <div className="saved-preference-links">
              <button type="button" onClick={() => switchMode('university')}>
                Trova la tua università
              </button>
              <Link href="/comparison?mode=courses">Usale nel comparatore</Link>
            </div>
          </div>
        ) : null}
        <div className="finder-mode-launcher" aria-label="Scegli lo strumento di orientamento">
          <button
            className={`finder-mode-card${mode === 'course' ? ' is-active' : ''}`}
            type="button"
            aria-pressed={mode === 'course'}
            onClick={() => switchMode('course')}
          >
            <span>01</span>
            <strong>Trova il mio corso</strong>
            <small>Parti dai tuoi interessi e scopri i percorsi più vicini a te.</small>
          </button>
          <button
            className={`finder-mode-card${mode === 'university' ? ' is-active' : ''}`}
            type="button"
            aria-pressed={mode === 'university'}
            onClick={() => switchMode('university')}
          >
            <span>02</span>
            <strong>Trova la mia università</strong>
            <small>Scegli già un corso o una macroarea e trova gli atenei più adatti.</small>
          </button>
        </div>
      </section>

      <div ref={courseRef} hidden={mode !== 'course'}>
        <CourseFinder
          onResult={setCourseResult}
          onFindUniversity={(courseSlug) => switchMode('university', { courseSlug })}
        />
      </div>

      <div ref={universityRef} hidden={mode !== 'university'}>
        {universityStart.token > 0 ? (
          <UniversityFinder
            startCourseSlug={universityStart.slug}
            startToken={universityStart.token}
            currentCourseResult={courseResult}
            onBackToCourse={() => switchMode('course')}
          />
        ) : null}
      </div>
    </>
  );
}
