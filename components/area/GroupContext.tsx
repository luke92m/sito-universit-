'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
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
  const fromProfile = Boolean(journey?.universityId);
  // Scelta fatta in questa sessione (undefined = usa quella salvata).
  const [override, setOverride] = useState<ToolContext | null | undefined>(undefined);
  const loadStored = useCallback(
    (): Promise<ToolContext | null> => (fromProfile ? Promise.resolve(null) : loadContext(kind)),
    [fromProfile, kind]
  );
  const [stored, setStored] = useState<{ kind: string; value: ToolContext | null } | null>(null);

  useEffect(() => {
    let active = true;
    loadStored().then((value) => {
      if (active) setStored({ kind, value });
    });
    return () => {
      active = false;
    };
  }, [loadStored, kind]);

  const journeyUniversity = journey?.universityId || '';
  const journeyCourse = journey?.courseName || '';
  // Memorizzato: le query di community e libri dipendono dall'identità di questo oggetto.
  const context = useMemo<ToolContext | null | undefined>(() => {
    if (fromProfile) return { universityId: journeyUniversity, courseName: journeyCourse };
    if (override !== undefined) return override;
    return stored?.kind === kind ? stored.value : undefined;
  }, [fromProfile, journeyUniversity, journeyCourse, override, stored, kind]);

  const save = useCallback(
    async (next: ToolContext) => {
      await saveContext(user.id, kind, next);
      setOverride(next);
    },
    [user.id, kind]
  );

  const reset = useCallback(async () => {
    await clearContext(kind);
    setOverride(null);
  }, [kind]);

  return { context, save, reset, fromProfile };
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
