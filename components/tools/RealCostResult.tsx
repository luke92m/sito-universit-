'use client';

import type { RealCostResponse } from '@/app/api/real-cost/route';
import { STUDENT_SERVICES } from '@/lib/data/student-services';
import { CONDITION_LABELS, type StudentCondition } from '@/lib/domain/dsu';
import { GRANT_KEYS } from '@/lib/domain/real-cost-keys';
import { formatDate } from '@/lib/site-config';

const euro = (value: number) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    useGrouping: 'always'
  }).format(value);
/** Soglie con i centesimi: arrotondarle cambierebbe chi rientra. */
const limit = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' }).format(value);
const amount = (min: number, max: number) =>
  Math.round(min) === Math.round(max) ? euro(min) : `${euro(min)} – ${euro(max)}`;

const ORIGIN_COPY: Record<
  RealCostResponse['conditionInfo']['origin'],
  (seat: string, entity: string) => string
> = {
  'tabella-1': (seat, entity) =>
    `Il tuo comune è tra quelli che ${entity} considera “in sede” per ${seat}, anche se ogni giorno viaggi.`,
  'tabella-2': (seat, entity) =>
    `Il tuo comune è tra quelli che ${entity} considera “pendolari” per ${seat}.`,
  'fuori-tabella': (seat, entity) =>
    `Il tuo comune non è negli elenchi di ${entity} per ${seat}: contano il tempo di viaggio con i mezzi pubblici e se prendi casa in affitto.`,
  stima: () => 'Stima da città e regione di residenza: controlla la definizione nel bando.',
  scelta: () => 'Condizione scelta da te.'
};

interface Props {
  result: RealCostResponse;
  onCondition: (condition: StudentCondition) => void;
  busy: boolean;
}

/** "Quanto ti costa davvero": un numero, le voci con la fonte e la borsa spiegata. */
export function RealCostResult({ result, onCondition, busy }: Props) {
  const { entity, scholarship, conditionInfo, total } = result;
  const grants = result.lines.filter((line) => GRANT_KEYS.includes(line.key));
  const costs = result.lines.filter((line) => !GRANT_KEYS.includes(line.key));
  const national = STUDENT_SERVICES.nationalThresholds;
  const belowNational = entity
    ? entity.thresholds.isee < national.isee || entity.thresholds.ispe < national.ispe
    : false;

  let grantTitle = '';
  let grantText = '';
  if (entity && scholarship) {
    const limits = `ISEE fino a ${limit(entity.thresholds.isee)} e ISPE fino a ${limit(entity.thresholds.ispe)}`;
    if (scholarship.status === 'eligible') {
      grantTitle = `Puoi chiedere la borsa ${entity.shortName}: vale ${amount(scholarship.amountMin, scholarship.amountMax)} l’anno.`;
      grantText = `Importo per chi è ${CONDITION_LABELS[conditionInfo.condition].toLowerCase()}, con la tua fascia ISEE. Requisiti economici: ${limits}.`;
    } else if (scholarship.status === 'uncertain') {
      grantTitle = 'Sei vicino alla soglia: con il valore esatto sapresti se ti spetta.';
      grantText = `${entity.shortName} chiede ${limits}. Inserisci ISEE e ISPE precisi per un risultato sicuro.`;
    } else if (scholarship.status === 'not-eligible') {
      grantTitle = `Con questi valori non puoi chiedere la borsa ${entity.shortName}.`;
      grantText = `Servono ${limits}${belowNational ? ', soglie più basse dei limiti nazionali' : ''}. Restano le riduzioni delle tasse per ISEE.`;
    } else {
      grantTitle = 'Senza ISEE non possiamo calcolare la borsa.';
      grantText = `${entity.shortName} chiede ${limits}. L’ISEE per il diritto allo studio si chiede gratis al CAF o sul sito INPS.`;
    }
  }

  return (
    <section className="real-cost" aria-labelledby="realCostTitle">
      <header className="real-cost-header">
        <div>
          <span className="eyebrow">Quanto ti costa davvero</span>
          <h2 id="realCostTitle">
            {amount(total.min, total.max)} <small>il primo anno</small>
          </h2>
          <p>
            {result.university.name} · sede di {result.seatCity}
            {result.course ? ` · ${result.course.name}` : ''} ·{' '}
            {CONDITION_LABELS[conditionInfo.condition].toLowerCase()}
          </p>
        </div>
        {entity ? (
          <span className="data-year-badge">
            bando {entity.academicYear} · verificato il {formatDate(entity.verifiedAt)}
          </span>
        ) : null}
      </header>

      <div className="real-cost-condition" role="group" aria-label="Condizione dello studente">
        <div>
          <strong>Condizione usata nel calcolo</strong>
          <small>
            {ORIGIN_COPY[conditionInfo.origin](conditionInfo.seat, entity?.shortName || 'l’ente regionale')}
            {conditionInfo.sourceUrl ? (
              <>
                {' '}
                <a href={conditionInfo.sourceUrl} target="_blank" rel="noreferrer">
                  Tabelle ufficiali
                </a>
              </>
            ) : null}
          </small>
        </div>
        <div className="real-cost-condition-options">
          {(Object.keys(CONDITION_LABELS) as StudentCondition[]).map((key) => (
            <button
              key={key}
              type="button"
              className={conditionInfo.condition === key ? 'is-active' : ''}
              aria-pressed={conditionInfo.condition === key}
              disabled={busy}
              onClick={() => onCondition(key)}
            >
              {CONDITION_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="real-cost-lines" role="table" aria-label="Voci del costo annuo">
        {costs.map((line) => (
          <div className="real-cost-line" role="row" key={line.key}>
            <div role="cell">
              <strong>{line.label}</strong>
              <small>{line.note}</small>
            </div>
            <div role="cell" className="real-cost-amount">
              {amount(line.min, line.max)}
              {line.source ? (
                <a
                  href={line.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className={line.estimated ? 'is-estimate' : ''}
                >
                  {line.estimated ? 'stima · ' : ''}
                  {line.source.label}
                </a>
              ) : null}
            </div>
          </div>
        ))}
        {grants.map((grant) => (
          <div className="real-cost-line is-grant" role="row" key={grant.key}>
            <div role="cell">
              <strong>{grant.label}</strong>
              <small>{grant.note}</small>
            </div>
            <div role="cell" className="real-cost-amount">
              − {amount(grant.min, grant.max)}
              {grant.source ? (
                <a href={grant.source.url} target="_blank" rel="noreferrer">
                  {grant.source.label}
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {entity && scholarship ? (
        <div className={`real-cost-grant scholarship-${scholarship.status}`}>
          <strong>{grantTitle}</strong>
          <p>{grantText}</p>
          {entity.accessRequirement ? (
            <p className="real-cost-requirement">
              <strong>Attenzione:</strong> {entity.accessRequirement.text}{' '}
              <a href={entity.accessRequirement.source.url} target="_blank" rel="noreferrer">
                {entity.accessRequirement.source.label}
              </a>
            </p>
          ) : null}
          {scholarship.status === 'eligible' || scholarship.status === 'uncertain' ? (
            <>
              <ul>
                {entity.connectedBenefits.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
                {scholarship.increments.map((increment) => (
                  <li key={increment.label}>
                    {increment.label} ({increment.conditional})
                  </li>
                ))}
              </ul>
              <details>
                <summary>Come e quando arriva la borsa al primo anno</summary>
                <ol>
                  {entity.firstYearPayments.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p>{entity.firstYearPayments.note}</p>
                <a href={entity.firstYearPayments.source.url} target="_blank" rel="noreferrer">
                  {entity.firstYearPayments.source.label}
                </a>
              </details>
            </>
          ) : null}
          <p className="real-cost-deadline">
            <strong>Domanda:</strong> per il {entity.academicYear} si poteva fare{' '}
            {entity.application.opens ? `dal ${formatDate(entity.application.opens)} ` : ''}entro il{' '}
            {formatDate(entity.application.closes)}
            {entity.application.closesTime ? ` alle ${entity.application.closesTime}` : ''}.{' '}
            {entity.application.note}{' '}
            <a href={entity.portal.url} target="_blank" rel="noreferrer">
              {entity.portal.label}
            </a>
          </p>
        </div>
      ) : null}

      {result.missing.length ? (
        <div className="real-cost-missing">
          <strong>Non ancora incluso con dati verificati:</strong>
          <ul>
            {result.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
