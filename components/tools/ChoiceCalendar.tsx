'use client';

import { useEffect, useState } from 'react';
import type { CalendarItem } from '@/lib/domain/choice-calendar';
import { formatDate } from '@/lib/site-config';

const KIND_LABELS: Record<CalendarItem['kind'], string> = {
  test: 'Test d’ingresso',
  isee: 'ISEE',
  borsa: 'Borsa di studio'
};

/** "dal 3 marzo", ma "dall’1, 8, 11 marzo". */
const fromDate = (value: string) => {
  const day = Number(value.slice(8, 10));
  return `${[1, 8, 11].includes(day) ? 'dall’' : 'dal '}${formatDate(value)}`;
};

/** "al 3 marzo", ma "all’1, 8, 11 marzo". */
const toDate = (value: string) => {
  const day = Number(value.slice(8, 10));
  return `${[1, 8, 11].includes(day) ? 'all’' : 'al '}${formatDate(value)}`;
};

function previousWindow(previous: NonNullable<CalendarItem['previous']>): string {
  return previous.opens
    ? `${previous.label}: ${fromDate(previous.opens)} ${toDate(previous.closes)}`
    : `${previous.label}: entro il ${formatDate(previous.closes)}`;
}

/** Scadenze della scelta per un ateneo, con la fonte accanto a ogni voce. Nessuna data stimata. */
export function ChoiceCalendar({ universityId }: { universityId: string }) {
  const [items, setItems] = useState<CalendarItem[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/choice-calendar?ateneo=${encodeURIComponent(universityId)}`)
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((payload: { items: CalendarItem[] }) => active && setItems(payload.items))
      .catch(() => active && setItems([]));
    return () => {
      active = false;
    };
  }, [universityId]);

  if (!items?.length) return null;

  return (
    <section className="choice-calendar" aria-labelledby="choiceCalendarTitle">
      <span className="eyebrow">Scadenze da tenere d’occhio</span>
      <h3 id="choiceCalendarTitle">Il calendario della scelta</h3>
      <ol>
        {items.map((item) => (
          <li key={item.id} className={`choice-calendar-item is-${item.status}`}>
            <div className="choice-calendar-when">
              <span>{KIND_LABELS[item.kind]}</span>
              <strong>
                {item.date
                  ? formatDate(item.date)
                  : item.status === 'regola'
                    ? 'Ogni anno'
                    : 'Data non ancora pubblicata'}
              </strong>
            </div>
            <div className="choice-calendar-what">
              <strong>{item.title}</strong>
              <p>{item.text}</p>
              {item.previous ? <p className="choice-calendar-previous">{previousWindow(item.previous)}</p> : null}
              <small>
                <a href={item.source.url} target="_blank" rel="noreferrer">
                  {item.source.label}
                </a>{' '}
                · verificato il {formatDate(item.verifiedAt)}
              </small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
