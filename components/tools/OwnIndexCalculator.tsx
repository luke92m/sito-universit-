'use client';

import { useState, type FormEvent } from 'react';
import type { OwnIndexField, OwnIndexInfo, OwnIndexInput } from '@/lib/domain/own-index';

/** Importi all'italiana ("45.000" o "45000,50"); il VSE è un indice con la virgola ("1,35"). */
function parseValue(key: OwnIndexField, value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const clean = key === 'vse' ? text.replace(',', '.') : text.replace(/[€\s.]/g, '').replace(',', '.');
  const number = Number(clean);
  return Number.isFinite(number) && number >= 0 ? number : NaN;
}

interface Props {
  info: OwnIndexInfo;
  busy: boolean;
  onSubmit: (input: OwnIndexInput) => void;
}

/**
 * Calcolo facoltativo dell'indicatore proprio dell'ateneo (reddito equivalente, ISEP, VSE): resta chiuso finché
 * lo studente non lo apre. I dati vanno solo al calcolo e non vengono salvati.
 */
export function OwnIndexCalculator({ info, busy, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: OwnIndexInput = {};
    for (const field of info.fields) {
      const number = parseValue(field.key, values[field.key] || '');
      if (Number.isNaN(number)) {
        setError(`Controlla il campo “${field.label}”: serve un numero.`);
        return;
      }
      if (number != null) input[field.key] = number;
    }
    const required = info.fields[0];
    if (input[required.key] == null || (info.kind === 'cattolica' && !input.members)) {
      setError(
        info.kind === 'cattolica'
          ? 'Servono il reddito netto e il numero di persone nel nucleo.'
          : `Serve almeno il campo “${required.label}”.`
      );
      return;
    }
    setError('');
    onSubmit(input);
  };

  const what = info.target === 'borsa' ? 'la borsa' : 'le tasse';
  return (
    <details className="own-index" open={info.filled || undefined}>
      <summary>
        {info.filled
          ? `Stima calcolata con il tuo ${info.indexName}${info.value != null ? `: ${info.value.toLocaleString('it-IT')}` : ''}`
          : `Calcola il tuo ${info.indexName} per avere ${what} precise`}
      </summary>
      <p>
        Questo ateneo non usa l’ISEE per {what}. Con i dati qui sotto il sito applica il regolamento
        ufficiale: è facoltativo e i valori non vengono salvati.{' '}
        <a href={info.source.url} target="_blank" rel="noreferrer">
          {info.source.label}
        </a>
      </p>
      <form onSubmit={submit} noValidate>
        <div className="own-index-fields">
          {info.fields.map((field) => (
            <label className="field" key={field.key}>
              <span>{field.label}</span>
              <input
                inputMode="decimal"
                autoComplete="off"
                value={values[field.key] || ''}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.key]: event.target.value }))
                }
              />
              <small>{field.help}</small>
            </label>
          ))}
        </div>
        {error ? (
          <p className="own-index-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="button button-secondary" disabled={busy}>
          {busy ? 'Calcolo…' : 'Aggiorna la stima'}
        </button>
      </form>
    </details>
  );
}
