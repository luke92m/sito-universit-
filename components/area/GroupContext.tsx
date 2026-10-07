'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSite } from '@/components/site/SiteProvider';
import { UniversityCombobox } from '@/components/site/UniversityCombobox';
import { clearContext, loadContext, saveContext, type ToolContext } from '@/lib/client/contexts';
import { journeyOf, type SiteUser } from '@/lib/client/types';
import { generalCoursesSorted } from '@/lib/domain/course-catalog';

/**
 * Gruppo di riferimento (ateneo + corso) per community e libri usati: i dati del percorso nel profilo
 * hanno la precedenza, altrimenti si usa la scelta salvata per lo strumento.
 */
export function useGroupContext(user: SiteUser, kind: 'community' | 'books') {
  const journey = journeyOf(user);
  const [context, setContext] = useState<ToolContext | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (journey?.universityId) {
      setContext({ universityId: journey.universityId, courseName: journey.courseName || '' });
      return;
    }
    loadContext(kind).then((stored) => {
      if (active) setContext(stored);
    });
    return () => {
      active = false;
    };
  }, [journey?.universityId, journey?.courseName, kind]);

  const save = useCallback(
    async (next: ToolContext) => {
      await saveContext(user.id, kind, next);
      setContext(next);
    },
    [user.id, kind]
  );

  const reset = useCallback(async () => {
    await clearContext(kind);
    setContext(null);
  }, [kind]);

  return { context, save, reset, fromProfile: Boolean(journey?.universityId) };
}

export function ContextSetup({
  kind,
  current,
  onSave
}: {
  kind: 'community' | 'books';
  current: ToolContext | null;
  onSave: (context: ToolContext) => void;
}) {
  const { universities } = useSite();
  const [universityId, setUniversityId] = useState(current?.universityId || '');
  const [courseName, setCourseName] = useState(current?.courseName || '');
  const [message, setMessage] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!universityId) {
      setMessage('Seleziona un ateneo.');
      return;
    }
    if (kind === 'books' && !courseName) {
      setMessage('Per i libri usati sono obbligatori ateneo e corso.');
      return;
    }
    onSave({ universityId, courseName });
  };

  return (
    <section className="service-card context-setup-card">
      <span className="eyebrow">Gruppo di riferimento</span>
      <h2>
        {kind === 'community'
          ? 'Scegli l’ateneo in cui vuoi entrare nella community'
          : 'Indica ateneo e corso per vedere gli annunci compatibili'}
      </h2>
      <form className="service-form compact-service-form" onSubmit={submit}>
        <label className="field field-wide">
          <span>Ateneo</span>
          <UniversityCombobox value={universityId} onChange={setUniversityId} options={universities} ariaLabel="Ateneo" />
        </label>
        <label className="field field-wide">
          <span>Corso</span>
          <select value={courseName} onChange={(event) => setCourseName(event.target.value)}>
            <option value="">Seleziona un corso</option>
            {generalCoursesSorted().map((course) => (
              <option key={course.slug} value={course.name}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <p className="form-message field-wide" data-type={message ? 'error' : undefined}>
          {message}
        </p>
        <button className="button button-primary field-wide" type="submit">
          Salva il gruppo
        </button>
      </form>
    </section>
  );
}
