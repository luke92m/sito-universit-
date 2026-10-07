'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { CourseNameSelect } from '@/components/site/CourseNameSelect';
import { useSite } from '@/components/site/SiteProvider';
import { UniversityCombobox } from '@/components/site/UniversityCombobox';
import { clearContext, loadContext, saveContext } from '@/lib/client/contexts';
import { journeyOf, type SiteUser } from '@/lib/client/types';
import { formatDate } from '@/lib/site-config';
import { loadSavedScholarships, type SavedScholarship } from './ScholarshipsSection';

interface DeadlineEvent {
  id: string;
  title: string;
  date: string;
  category?: string;
  notes?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  sourceType?: string;
  confidence?: string;
}

interface DeadlineContext {
  universityId: string;
  courseName: string;
  source: 'profile' | 'deadlines' | 'bureaucracy' | 'scholarship';
}

const CONTEXT_LABELS: Record<DeadlineContext['source'], string> = {
  profile: 'Dati del profilo',
  deadlines: 'Ateneo scelto per le scadenze',
  bureaucracy: 'Ultima ricerca in Burocrazia',
  scholarship: 'Ultima borsa salvata'
};

const CATEGORY_LABELS: Record<string, string> = {
  borsa: 'Borsa di studio',
  rata: 'Rata e contribuzione',
  esame: 'Esame o appello',
  test: 'Test o graduatoria',
  immatricolazione: 'Immatricolazione',
  burocrazia: 'Procedura amministrativa'
};

const categoryLabel = (value?: string) => CATEGORY_LABELS[value || ''] || 'Scadenza universitaria';

function normalize(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function relativeDeadline(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { label: 'Data non valida', tone: 'muted', days: Infinity };
  const diff = Math.round((date.getTime() - startOfToday().getTime()) / 86400000);
  if (diff < 0) return { label: `Scaduta da ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'giorno' : 'giorni'}`, tone: 'danger', days: diff };
  if (diff === 0) return { label: 'Scade oggi', tone: 'danger', days: 0 };
  if (diff === 1) return { label: 'Scade domani', tone: 'warning', days: 1 };
  if (diff <= 14) return { label: `Mancano ${diff} giorni`, tone: 'warning', days: diff };
  return { label: `Mancano ${diff} giorni`, tone: 'success', days: diff };
}

function sortForList(items: DeadlineEvent[]): DeadlineEvent[] {
  return items.slice().sort((left, right) => {
    const leftDiff = relativeDeadline(left.date).days;
    const rightDiff = relativeDeadline(right.date).days;
    const leftPast = leftDiff < 0;
    const rightPast = rightDiff < 0;
    if (leftPast !== rightPast) return leftPast ? 1 : -1;
    return leftPast ? rightDiff - leftDiff : leftDiff - rightDiff;
  });
}

function savedScholarshipDeadlines(items: SavedScholarship[], shortName: (id: string) => string): DeadlineEvent[] {
  return items
    .filter((item) => item.deadline)
    .map((item) => ({
      id: `saved-${item.id}`,
      title: `Borsa di studio — ${shortName(item.university_id) || item.university_name || 'ateneo'}`,
      date: item.deadline as string,
      category: 'borsa',
      notes: 'Data salvata con l’opportunità.',
      sourceLabel: 'Opportunità salvata',
      sourceUrl: item.portal_url || '#',
      sourceType: 'saved',
      confidence: 'alta'
    }));
}

function mergeDeadlines(items: DeadlineEvent[], saved: DeadlineEvent[]): DeadlineEvent[] {
  const map = new Map<string, DeadlineEvent>();
  [...items, ...saved].forEach((item) => {
    if (!item?.date) return;
    const key = `${item.date}|${normalize(item.title)}|${item.category || ''}`;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
}

const isoDate = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

function Calendar({ items, month, onMove }: { items: DeadlineEvent[]; month: Date; onMove: (delta: number) => void }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const now = new Date();
  const todayKey = isoDate(now.getFullYear(), now.getMonth(), now.getDate());
  const byDate = new Map<string, DeadlineEvent[]>();
  items.forEach((item) => byDate.set(item.date, [...(byDate.get(item.date) || []), item]));

  const cells: React.ReactNode[] = [];
  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(<div key={`empty-${index}`} className="deadline-calendar-day is-empty" aria-hidden="true" />);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = isoDate(year, monthIndex, day);
    const dayItems = byDate.get(key) || [];
    cells.push(
      <div
        key={key}
        className={`deadline-calendar-day${key === todayKey ? ' is-today' : ''}${dayItems.length ? ' has-events' : ''}`}
      >
        <span className="calendar-day-number">{day}</span>
        <div className="calendar-day-events">
          {dayItems.slice(0, 2).map((item) =>
            item.sourceUrl && item.sourceUrl !== '#' ? (
              <a key={item.id} href={item.sourceUrl} target="_blank" rel="noreferrer" title={item.title}>
                <span>{categoryLabel(item.category)}</span>
                {item.title}
              </a>
            ) : (
              <span key={item.id} className="calendar-event-static" title={item.title}>
                {item.title}
              </span>
            )
          )}
          {dayItems.length > 2 ? <small>+{dayItems.length - 2} altre</small> : null}
        </div>
      </div>
    );
  }
  while (cells.length % 7) {
    cells.push(<div key={`tail-${cells.length}`} className="deadline-calendar-day is-empty" aria-hidden="true" />);
  }

  return (
    <>
      <div className="deadline-calendar-toolbar">
        <button type="button" aria-label="Mese precedente" onClick={() => onMove(-1)}>
          ←
        </button>
        <strong>{month.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</strong>
        <button type="button" aria-label="Mese successivo" onClick={() => onMove(1)}>
          →
        </button>
      </div>
      <div className="deadline-calendar-weekdays" aria-hidden="true">
        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="deadline-calendar-grid">{cells}</div>
      <p className="calendar-help">Clicca una scadenza per aprire direttamente la pagina ufficiale da cui è stata rilevata.</p>
    </>
  );
}

function DeadlineList({ items }: { items: DeadlineEvent[] }) {
  const sorted = sortForList(items);
  if (!sorted.length) {
    return (
      <div className="automatic-deadline-empty">
        <strong>Nessuna data verificabile trovata.</strong>
        <p>
          Il sito non inserisce date inventate. Usa “Aggiorna ora” oppure apri le fonti ufficiali indicate nel riquadro di
          sincronizzazione.
        </p>
      </div>
    );
  }
  return (
    <div className="deadline-list automatic-deadline-list">
      {sorted.map((item) => {
        const relative = relativeDeadline(item.date);
        const date = new Date(`${item.date}T00:00:00`);
        return (
          <article className={`deadline-item deadline-${relative.tone}`} key={item.id}>
            <div className="deadline-date">
              <strong>{date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</strong>
              <span>{date.getFullYear()}</span>
            </div>
            <div className="deadline-copy">
              <span className="deadline-category">{categoryLabel(item.category)}</span>
              <h3>{item.title}</h3>
              <p>{item.notes || ''}</p>
              <small>
                {item.sourceLabel || 'Fonte ufficiale'} · rilevamento {item.confidence || 'automatico'}
              </small>
              {item.sourceUrl && item.sourceUrl !== '#' ? (
                <a className="deadline-source-link" href={item.sourceUrl} target="_blank" rel="noreferrer">
                  Apri la fonte ufficiale →
                </a>
              ) : null}
            </div>
            <div className="deadline-status">
              <strong>{relative.label}</strong>
              <small>Rilevata automaticamente</small>
            </div>
          </article>
        );
      })}
    </div>
  );
}

type SyncState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; count: number; generated: string; warning: string }
  | { kind: 'error' };

export function DeadlinesSection({ user }: { user: SiteUser }) {
  const { getUniversity, openJourneyEditor } = useSite();
  const journey = journeyOf(user);
  const [context, setContext] = useState<DeadlineContext | null | undefined>(undefined);
  const [saved, setSaved] = useState<SavedScholarship[]>([]);
  const [events, setEvents] = useState<DeadlineEvent[]>([]);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [anchored, setAnchored] = useState(false);
  const [sync, setSync] = useState<SyncState>({ kind: 'idle' });
  const [formUniversity, setFormUniversity] = useState('');
  const [formCourse, setFormCourse] = useState('');
  const [formMessage, setFormMessage] = useState('');

  // Porting di getDeadlineContext(): profilo → scelta esplicita → Burocrazia → ultima borsa salvata.
  const resolveContext = useCallback(async () => {
    const scholarships = await loadSavedScholarships();
    setSaved(scholarships);
    if (journey?.universityId) {
      setContext({ universityId: journey.universityId, courseName: journey.courseName || '', source: 'profile' });
      return;
    }
    const explicit = await loadContext('deadlines');
    if (explicit) {
      setContext({ ...explicit, source: 'deadlines' });
      return;
    }
    const bureaucracy = await loadContext('bureaucracy');
    if (bureaucracy) {
      setContext({ ...bureaucracy, source: 'bureaucracy' });
      return;
    }
    const scholarship = scholarships.slice().reverse().find((item) => item.university_id);
    setContext(
      scholarship ? { universityId: scholarship.university_id, courseName: scholarship.course_name || '', source: 'scholarship' } : null
    );
  }, [journey?.universityId, journey?.courseName]);

  useEffect(() => {
    resolveContext();
  }, [resolveContext]);

  const savedEvents = useMemo(
    () => savedScholarshipDeadlines(saved, (id) => getUniversity(id)?.shortName || ''),
    [saved, getUniversity]
  );

  const load = useCallback(
    async (force: boolean) => {
      if (!context) return;
      setSync({ kind: 'loading' });
      try {
        const params = new URLSearchParams({
          universityId: context.universityId,
          course: context.courseName || '',
          situation: user.profile.situation
        });
        const response = await fetch(`/api/deadlines?${params.toString()}`, { cache: force ? 'reload' : 'default' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        const merged = mergeDeadlines(Array.isArray(result.events) ? result.events : [], savedEvents);
        setEvents(merged);
        if (!anchored && merged.length) {
          const first = sortForList(merged).find((item) => relativeDeadline(item.date).days >= 0) || merged[0];
          const date = new Date(`${first.date}T00:00:00`);
          setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
          setAnchored(true);
        }
        setSync({
          kind: 'done',
          count: merged.length,
          generated: result.generatedAt
            ? formatDate(new Date(result.generatedAt), { hour: '2-digit', minute: '2-digit' })
            : formatDate(new Date()),
          warning: result.warning || ''
        });
      } catch {
        setEvents(mergeDeadlines([], savedEvents));
        setSync({ kind: 'error' });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context, savedEvents, user.profile.situation]
  );

  useEffect(() => {
    if (context) load(false);
  }, [context, load]);

  const university = context ? getUniversity(context.universityId) : null;

  const saveFormContext = async (event: FormEvent) => {
    event.preventDefault();
    if (!formUniversity) {
      setFormMessage('Seleziona l’ateneo da monitorare.');
      return;
    }
    await saveContext(user.id, 'deadlines', { universityId: formUniversity, courseName: formCourse });
    setFormMessage('');
    setAnchored(false);
    setContext({ universityId: formUniversity, courseName: formCourse, source: 'deadlines' });
  };

  const changeContext = async () => {
    if (journey?.universityId) {
      openJourneyEditor();
      return;
    }
    await clearContext('deadlines');
    await clearContext('bureaucracy');
    setEvents([]);
    setSync({ kind: 'idle' });
    setAnchored(false);
    setContext(null);
  };

  if (context === undefined) {
    return <p className="empty-state">Caricamento del contesto…</p>;
  }

  return (
    <>
      <section className="service-card deadline-sync-card">
        <div className="service-card-heading">
          <div>
            <span className="eyebrow">Sincronizzazione automatica</span>
            <h2>Le scadenze arrivano dalle fonti ufficiali.</h2>
          </div>
          <button
            className="button button-secondary"
            type="button"
            disabled={!context || sync.kind === 'loading'}
            onClick={() => load(true)}
          >
            Aggiorna ora
          </button>
        </div>
        {context && university ? (
          <div className="deadline-context-summary">
            <div>
              <span>{CONTEXT_LABELS[context.source]}</span>
              <strong>{university.name}</strong>
              <small>{context.courseName || 'Tutti i corsi'}</small>
            </div>
            <button className="text-button" type="button" onClick={changeContext}>
              {journey?.universityId ? 'Modifica nel profilo' : 'Cambia ateneo o corso'}
            </button>
          </div>
        ) : (
          <form className="service-form compact-service-form" onSubmit={saveFormContext} noValidate>
            <label className="field field-wide">
              <span>Ateneo da monitorare</span>
              <UniversityCombobox
                value={formUniversity}
                onChange={(id) => {
                  setFormUniversity(id);
                  setFormCourse('');
                }}
                ariaLabel="Ateneo da monitorare"
                required
              />
            </label>
            <label className="field field-wide">
              <span>
                Corso <small>(facoltativo)</small>
              </span>
              <CourseNameSelect
                universityId={formUniversity}
                value={formCourse}
                onChange={setFormCourse}
                emptyLabel="Tutti i corsi / corso non indicato"
              />
            </label>
            <p className="service-form-note field-wide">
              Non stai inserendo una scadenza: stai soltanto indicando quali fonti ufficiali il sito deve monitorare.
            </p>
            <p className="form-message field-wide" data-type={formMessage ? 'error' : undefined}>
              {formMessage}
            </p>
            <button className="button button-primary field-wide" type="submit">
              Sincronizza le scadenze
            </button>
          </form>
        )}
        <div className="deadline-sync-status" role="status" aria-live="polite">
          {!context ? (
            <p>
              <strong>Serve un ateneo di riferimento.</strong> Selezionalo una sola volta e il sito cercherà le date al posto
              tuo.
            </p>
          ) : sync.kind === 'loading' || sync.kind === 'idle' ? (
            <>
              <span className="sync-spinner" aria-hidden="true" />
              <p>
                <strong>Sincronizzazione in corso…</strong> Cerchiamo date relative a iscrizioni, rate, borse, test, esami e
                procedure.
              </p>
            </>
          ) : sync.kind === 'done' ? (
            <>
              <span className="sync-ok" aria-hidden="true">
                ✓
              </span>
              <p>
                <strong>{sync.count ? `${sync.count} scadenze rilevate` : 'Nessuna scadenza verificabile rilevata'}.</strong>{' '}
                Ultimo controllo: {sync.generated}.
                <br />
                <small>{sync.warning}</small>
              </p>
            </>
          ) : (
            <>
              <span className="sync-warning" aria-hidden="true">
                !
              </span>
              <p>
                <strong>Sincronizzazione non disponibile.</strong> Il servizio prova a leggere le fonti ufficiali: riprova tra
                qualche minuto.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="service-card automatic-deadline-board">
        <div className="service-card-heading deadline-board-heading">
          <div>
            <span className="eyebrow">Calendario personale</span>
            <h2>Scadenze rilevate</h2>
          </div>
          <div className="deadline-view-switch" role="group" aria-label="Modalità di visualizzazione">
            {(['calendar', 'list'] as const).map((key) => (
              <button
                key={key}
                className={view === key ? 'is-active' : ''}
                type="button"
                aria-pressed={view === key}
                onClick={() => setView(key)}
              >
                {key === 'calendar' ? 'Calendario' : 'Elenco'}
              </button>
            ))}
          </div>
        </div>
        <div className="automatic-deadlines-view">
          {!context || sync.kind === 'loading' || sync.kind === 'idle' ? (
            <div className="deadline-loading-state">
              <span className="sync-spinner" aria-hidden="true" />
              <p>{context ? 'Analisi delle fonti ufficiali…' : 'Seleziona un ateneo per avviare la sincronizzazione.'}</p>
            </div>
          ) : view === 'list' ? (
            <DeadlineList items={events} />
          ) : (
            <Calendar
              items={events}
              month={month}
              onMove={(delta) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))}
            />
          )}
        </div>
      </section>

      <section className="source-disclaimer">
        <strong>Aggiornamento automatico con controllo umano sempre consigliato.</strong>
        <p>
          Il sito legge le pagine pubbliche dell’ateneo e dell’ente per il diritto allo studio, estrae le date e le ordina
          rispetto a oggi. Una pagina può cambiare struttura o contenere date riferite ad altri studenti: prima di pagare o
          inviare una domanda apri sempre la fonte ufficiale collegata.
        </p>
      </section>
    </>
  );
}
