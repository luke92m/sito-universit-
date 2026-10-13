'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSite } from '@/components/site/SiteProvider';
import { FlowSteps } from '@/components/flow/FlowSteps';
import type { CoursePreferences } from '@/lib/client/types';
import { finderStateFromParams, type FinderLinkState } from '@/lib/flow/journey-params';
import { CourseFinder } from './CourseFinder';
import { UniversityFinder } from './UniversityFinder';

type Mode = 'course' | 'university';

export function FinderPage() {
  const { coursePreferences } = useSite();
  const [mode, setMode] = useState<Mode>('course');
  const [courseResult, setCourseResult] = useState<CoursePreferences | null>(null);
  const [universityStart, setUniversityStart] = useState<{ slug: string; token: number; link: FinderLinkState | null }>({
    slug: '',
    token: 0,
    link: null
  });
  const universityRef = useRef<HTMLDivElement>(null);
  const courseRef = useRef<HTMLDivElement>(null);

  const switchMode = (
    next: Mode,
    options: { courseSlug?: string; instant?: boolean; link?: FinderLinkState | null } = {}
  ) => {
    setMode(next);
    const behavior: ScrollBehavior = options.instant ? 'auto' : 'smooth';
    if (next === 'university') {
      setUniversityStart((current) => ({
        slug: options.courseSlug || '',
        token: current.token + 1,
        link: options.link || null
      }));
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

  // Accesso diretto al secondo test: /trova-corso#trova-universita oppure ?mode=university,
  // anche con le risposte di un link condiviso. L'URL è uno stato esterno: lo si legge dopo l'idratazione.
  const switchModeRef = useRef(switchMode);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.hash !== '#trova-universita' && params.get('mode') !== 'university') return;
    const link = finderStateFromParams(params);
    const timer = window.setTimeout(() => switchModeRef.current('university', { instant: true, link }));
    return () => window.clearTimeout(timer);
  }, []);

  const top = coursePreferences?.recommendations?.[0];

  return (
    <>
      <section className="page-hero compact finder-page-hero" aria-labelledby="finderTitle">
        <FlowSteps
          current={mode === 'course' ? 0 : 1}
          actions={{ 0: () => switchMode('course'), 1: () => switchMode('university') }}
        />
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
            key={universityStart.token}
            startCourseSlug={universityStart.slug}
            currentCourseResult={courseResult}
            onBackToCourse={() => switchMode('course')}
            linkState={universityStart.link}
          />
        ) : null}
      </div>
    </>
  );
}
