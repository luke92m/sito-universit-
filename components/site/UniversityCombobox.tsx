'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { UniversitySummary } from '@/lib/client/types';
import { normalizeSearch } from '@/lib/domain/text';
import { Icon } from './Icons';
import { useSite } from './SiteProvider';

interface Props {
  value: string;
  onChange: (universityId: string) => void;
  /** Elenco alternativo (es. solo atenei con corsi); di default tutti gli atenei. */
  options?: UniversitySummary[];
  ariaLabel?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

const labelOf = (university: UniversitySummary) => `${university.name} — ${university.city}`;

// Porting di enhanceUniversitySelect(): ricerca per inizio nome, poi inizio parola, poi contenuto.
function filterUniversities(records: UniversitySummary[], query: string): UniversitySummary[] {
  const term = normalizeSearch(query);
  if (!term) return records;
  const beginning = records.filter((record) => normalizeSearch(record.name).startsWith(term));
  if (beginning.length) return beginning;
  const wordBeginning = records.filter((record) =>
    normalizeSearch(record.name)
      .split(/\s+/)
      .some((word) => word.startsWith(term))
  );
  if (wordBeginning.length) return wordBeginning;
  return records.filter((record) => normalizeSearch(record.name).includes(term));
}

export function UniversityCombobox({
  value,
  onChange,
  options,
  ariaLabel = 'Cerca e seleziona un ateneo',
  placeholder = 'Scrivi il nome dell’ateneo',
  required,
  disabled,
  id
}: Props) {
  const { universities } = useSite();
  const records = options || universities;
  const selected = useMemo(() => records.find((record) => record.id === value) || null, [records, value]);
  const [text, setText] = useState(selected ? labelOf(selected) : '');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(selected ? labelOf(selected) : '');
  }, [selected]);

  const visible = useMemo(() => filterUniversities(records, query), [records, query]);

  const openList = (nextQuery: string) => {
    setQuery(nextQuery);
    setActive(-1);
    setOpen(true);
  };

  const close = (resetInput: boolean) => {
    setOpen(false);
    setActive(-1);
    if (resetInput) setText(selected ? labelOf(selected) : '');
  };

  const choose = (record: UniversitySummary) => {
    onChange(record.id);
    setText(labelOf(record));
    close(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelectorAll('[role="option"]')[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  return (
    <div className={`university-combobox${open ? ' is-open' : ''}`}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        className="university-combobox-input"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-required={required}
        aria-activedescendant={open && active >= 0 ? `${listId}-option-${active}` : undefined}
        disabled={disabled}
        value={text}
        onFocus={() => openList('')}
        onClick={() => openList('')}
        onChange={(event) => {
          setText(event.target.value);
          if (selected && event.target.value !== labelOf(selected)) onChange('');
          openList(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open) openList(text);
            setActive((index) => Math.min(index + 1, visible.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) openList(text);
            setActive((index) => (index <= 0 ? visible.length - 1 : index - 1));
          } else if (event.key === 'Enter' && open && active >= 0) {
            event.preventDefault();
            choose(visible[active]);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            close(true);
          }
        }}
        onBlur={() => window.setTimeout(() => close(true), 120)}
      />
      <button
        type="button"
        className="university-combobox-toggle"
        aria-label="Mostra tutti gli atenei"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) close(true);
          else {
            inputRef.current?.focus();
            openList('');
          }
        }}
      >
        <Icon name="chevron" />
      </button>
      <div className="university-combobox-list" role="listbox" id={listId} hidden={!open} ref={listRef}>
        {visible.length ? (
          visible.map((record, index) => (
            <button
              key={record.id}
              type="button"
              id={`${listId}-option-${index}`}
              className={`university-combobox-option${index === active ? ' is-active' : ''}`}
              role="option"
              aria-selected={record.id === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(record)}
            >
              <strong>{record.name}</strong>
              <small>{record.city}</small>
            </button>
          ))
        ) : (
          <p className="university-combobox-empty">Nessun ateneo corrisponde a questa ricerca.</p>
        )}
      </div>
    </div>
  );
}
