'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { RealCostResponse } from '@/app/api/real-cost/route';
import { useSite } from '@/components/site/SiteProvider';
import { STUDENT_SERVICES } from '@/lib/data/student-services';
import { CONDITION_LABELS, type StudentCondition } from '@/lib/domain/dsu';
import { normalizedIseeValue } from '@/lib/domain/isee';
import { GRANT_KEYS } from '@/lib/domain/real-cost-keys';
import { scholarshipHref } from '@/lib/flow/journey-params';

const euro = (value: number) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    useGrouping: 'always'
  }).format(value);
const amount = (min: number, max: number) =>
  Math.round(min) === Math.round(max) ? euro(min) : `${euro(min)} – ${euro(max)}`;

interface Side {
  universityId: string;
  courseId: string;
}

const SCHOLARSHIP_COPY: Record<string, string> = {
  eligible: 'Borsa: ti spetta con questo ISEE',
  uncertain: 'Borsa: sei vicino alla soglia',
  'not-eligible': 'Borsa: non ti spetta con questo ISEE',
  unknown: 'Borsa: serve l’ISEE per saperlo'
};

/** Cosa dice il confronto dei due totali: differenza solo se gli intervalli non si sovrappongono. */
function verdict(results: RealCostResponse[]): string {
  const [a, b] = results;
  if (!a || !b) return '';
  if (a.total.max < b.total.min) return `A costa almeno ${euro(b.total.min - a.total.max)} in meno l’anno.`;
  if (b.total.max < a.total.min) return `B costa almeno ${euro(a.total.min - b.total.max)} in meno l’anno.`;
  return 'Con questi dati il costo annuo dei due è simile.';
}

/** "Quanto ti costa davvero" per i due lati del confronto, con ISEE e condizione scelti qui. */
export function ComparisonRealCost({ sides }: { sides: Side[] }) {
  const { guidance, updateGuidance } = useSite();
  const [isee, setIsee] = useState(() => normalizedIseeValue(guidance.iseeRange) || 'unknown');
  // null: condizione dedotta per ogni ateneo da residenza, preferenze e tabelle dei comuni dell'ente.
  const [condition, setCondition] = useState<StudentCondition | null>(null);
  const [results, setResults] = useState<RealCostResponse[] | null>(null);
  const [failed, setFailed] = useState(false);
  const key = sides.map((side) => `${side.universityId}|${side.courseId}`).join('/');

  useEffect(() => {
    let active = true;
    const load = (side: Side) =>
      fetch('/api/real-cost', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          universityId: side.universityId,
          courseId: side.courseId,
          isee: { range: isee },
          ispe: { range: 'unknown' },
          residenceRegion: guidance.residenceRegion || '',
          residenceCity: guidance.residenceCity || '',
          commutes: guidance.commutePreference === 'yes',
          condition: condition || undefined
        })
      }).then((response) => (response.ok ? (response.json() as Promise<RealCostResponse>) : Promise.reject()));
    Promise.all(sides.map(load))
      .then((next) => {
        if (!active) return;
        setResults(next);
        setFailed(false);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
    // `key` riassume i lati: l'array cambia identità a ogni render del genitore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isee, condition, guidance.residenceRegion, guidance.residenceCity, guidance.commutePreference]);

  const changeIsee = (value: string) => {
    setIsee(value);
    void updateGuidance({ iseeRange: value === 'unknown' ? '' : value });
  };

  return (
    <section className="comparison-real-cost" aria-labelledby="comparisonRealCostTitle">
      <header>
        <span className="eyebrow">Quanto ti costa davvero</span>
        <h3 id="comparisonRealCostTitle">Il primo anno, con il tuo ISEE e la borsa</h3>
      </header>

      <div className="comparison-real-cost-controls">
        <label>
          <span>La tua fascia ISEE</span>
          <select value={isee} onChange={(event) => changeIsee(event.target.value)}>
            {STUDENT_SERVICES.iseeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </label>
        <div className="real-cost-condition-options" role="group" aria-label="Condizione dello studente">
          <button
            type="button"
            className={condition === null ? 'is-active' : ''}
            aria-pressed={condition === null}
            onClick={() => setCondition(null)}
            title="Dedotta per ogni ateneo dalla tua residenza e dalle tabelle dei comuni dell’ente regionale"
          >
            Automatica
          </button>
          {(Object.keys(CONDITION_LABELS) as StudentCondition[]).map((item) => (
            <button
              key={item}
              type="button"
              className={condition === item ? 'is-active' : ''}
              aria-pressed={condition === item}
              onClick={() => setCondition(item)}
            >
              {CONDITION_LABELS[item]}
            </button>
          ))}
        </div>
      </div>

      {failed ? (
        <p className="comparison-real-cost-error">Costo reale non disponibile: controlla la connessione e riprova.</p>
      ) : results ? (
        <>
          <div className="comparison-real-cost-grid">
            {results.map((result, index) => {
              const tuition = result.lines.find((line) => line.key === 'tasse');
              const verifiedTuition = tuition ? !tuition.estimated : false;
              const grantMax = result.lines
                .filter((line) => GRANT_KEYS.includes(line.key))
                .reduce((total, line) => total + line.max, 0);
              const costMin = result.lines
                .filter((line) => !GRANT_KEYS.includes(line.key))
                .reduce((total, line) => total + line.min, 0);
              const surplus = Math.round(grantMax - costMin);
              return (
                <article className="comparison-real-cost-card" key={`${result.university.id}-${index}`}>
                  <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
                  <p className="comparison-real-cost-name">
                    {result.university.name}
                    {result.course ? <small>{result.course.name}</small> : null}
                    <small>
                      {result.conditionLabel}
                      {condition === null && !guidance.residenceCity ? ' (indica la tua residenza nel questionario per una stima migliore)' : ''}
                    </small>
                  </p>
                  <strong className="comparison-real-cost-total">{amount(result.total.min, result.total.max)}</strong>
                  <small className="comparison-real-cost-scope">
                    {surplus > 0 ? `La borsa copre tutto e avanzano fino a ${euro(surplus)}. ` : ''}
                    {result.condition === 'fuoriSede'
                      ? 'Tasse, affitto e spese di vita.'
                      : 'Solo tasse: trasporti e spese personali non sono stimati.'}
                  </small>
                  <ul>
                    {result.lines.map((line) => (
                      <li key={line.key} className={GRANT_KEYS.includes(line.key) ? 'is-grant' : ''}>
                        <span>{line.label}</span>
                        <span>
                          {GRANT_KEYS.includes(line.key) ? '− ' : ''}
                          {amount(line.min, line.max)}
                          {line.estimated ? <em> stima</em> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="comparison-real-cost-tags">
                    <span className={verifiedTuition ? 'is-verified' : 'is-pending'}>
                      {verifiedTuition ? 'Tasse per ISEE verificate' : 'Tasse: media nazionale, non per ISEE'}
                    </span>
                    <span className={result.entity ? 'is-verified' : 'is-pending'}>
                      {result.entity
                        ? `${SCHOLARSHIP_COPY[result.scholarship?.status || 'unknown']} (${result.entity.shortName})`
                        : 'Bando borsa non ancora nel sito: la borsa non è sottratta'}
                    </span>
                  </p>
                  <Link href={scholarshipHref(result.university.id, result.course?.name)}>
                    Dettaglio voce per voce, con le fonti
                  </Link>
                </article>
              );
            })}
          </div>
          <p className="comparison-real-cost-verdict">
            <strong>{verdict(results)}</strong>{' '}
            {isee === 'unknown'
              ? 'Senza ISEE si paga il massimo delle tasse e la borsa non si può calcolare: scegli la tua fascia.'
              : 'ISPE non indicato: la borsa è calcolata solo sull’ISEE. Nel dettaglio puoi inserire entrambi.'}
          </p>
        </>
      ) : (
        <p className="comparison-real-cost-loading">Calcolo dei costi…</p>
      )}
    </section>
  );
}
