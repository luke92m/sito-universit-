'use client';

import Link from 'next/link';
import type { FinderApiResult } from '@/app/api/finder/route';

const SCORE_ROWS = [
  { key: 'course', label: 'Compatibilità del corso' },
  { key: 'geography', label: 'Compatibilità geografica' },
  { key: 'ranking', label: 'Ranking ufficiale' },
  { key: 'cost', label: 'Sostenibilità economica' },
  { key: 'language', label: 'Lingua' },
  { key: 'support', label: 'Borse e sostegni' }
] as const;

function formatCurrency(value: number, maximumFractionDigits = 0): string {
  if (!Number.isFinite(Number(value))) return 'dato non disponibile';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits }).format(value);
}

export function courseLink(item: FinderApiResult): string {
  const params = new URLSearchParams({
    universityId: item.university.id,
    course: item.course.name,
    classCode: item.course.classCode || ''
  });
  return `/api/course-link?${params.toString()}`;
}

export function scholarshipLink(item: FinderApiResult): string {
  return `/api/scholarship-link?${new URLSearchParams({ universityId: item.university.id }).toString()}`;
}

function scholarshipInternalLink(item: FinderApiResult): string {
  return `/area-studente/borse-di-studio?${new URLSearchParams({ ateneo: item.university.id, corso: item.course.name }).toString()}`;
}

function rankingSourceText(item: FinderApiResult): string {
  if (item.ranking.source === 'qs-subject') return 'QS per materia: fonte prioritaria per valutare il corso';
  if (item.ranking.source === 'censis-teaching') return 'Fallback ufficiale CENSIS della didattica';
  if (item.ranking.source === 'censis-general')
    return 'Fallback ufficiale CENSIS generale, nella categoria omogenea dell’ateneo';
  return 'Nessun ranking ufficiale collegato: nessun indice interno sostitutivo';
}

function scoreOf(item: FinderApiResult, key: (typeof SCORE_ROWS)[number]['key']): number {
  if (key === 'course') return item.courseMatch.score;
  return item[key].score;
}

function CalculationDetails({ item }: { item: FinderApiResult }) {
  const support = item.support.breakdown;
  const supportItems: [string, number][] = [
    ['Beneficiari', support.beneficiary],
    ['Qualità/copertura', support.quality],
    ['Alloggi', support.housing],
    ['Esoneri', support.exemptions],
    ['Sistema regionale', support.regional],
    ['Sostegno ISEE', support.isee],
    ['Merito', support.merit]
  ];

  return (
    <details className="university-calculation-details">
      <summary>Vedi il calcolo completo</summary>
      <div className="university-calculation-body">
        <div className="university-score-table" role="table" aria-label="Calcolo del punteggio">
          <div className="university-score-row is-header" role="row">
            <span>Parametro</span>
            <span>Punteggio</span>
            <span>Peso</span>
            <span>Contributo</span>
          </div>
          {SCORE_ROWS.map((row) => (
            <div className="university-score-row" role="row" key={row.key}>
              <strong>{row.label}</strong>
              <span>{scoreOf(item, row.key).toFixed(1)}</span>
              <span>{Math.round(item.weights[row.key] * 100)}%</span>
              <span>{item.contributions[row.key].toFixed(2)}</span>
            </div>
          ))}
          <div className="university-score-row is-total" role="row">
            <strong>Totale</strong>
            <span />
            <span>100%</span>
            <span>{item.totalRaw.toFixed(2)}</span>
          </div>
        </div>

        <section className="university-calculation-section">
          <h4>Corrispondenza del corso</h4>
          <p>
            <strong>
              {item.courseMatch.label} · {item.courseMatch.score}/100.
            </strong>{' '}
            {item.courseMatch.reason}
          </p>
        </section>

        <section className="university-calculation-section">
          <h4>Ranking</h4>
          <p>{item.ranking.note}</p>
          {item.ranking.official ? (
            <ul className="university-ranking-source-list">
              {item.ranking.details.map((detail, index) => {
                const visible = detail.rank || (detail.position ? `#${detail.position}` : '');
                const scoreCopy = Number.isFinite(Number(detail.score))
                  ? `punteggio algoritmo ${Number(detail.score).toFixed(1)}`
                  : Number.isFinite(Number(detail.rawScore))
                    ? `punteggio fonte ${Number(detail.rawScore).toFixed(1)}`
                    : 'dato ufficiale';
                const weightCopy = Number.isFinite(Number(detail.weight))
                  ? ` · peso relativo ${Math.round(Number(detail.weight) * 100)}%`
                  : '';
                return (
                  <li key={`${detail.label}-${index}`}>
                    <a href={detail.url || item.ranking.url || '#'} target="_blank" rel="noreferrer">
                      {detail.label} {visible}
                    </a>
                    <span>{scoreCopy + weightCopy}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="university-calculation-note">{item.ranking.note}</p>
          )}
        </section>

        <section className="university-calculation-section">
          <h4>Borse e sostegni · {item.support.score.toFixed(1)}/100</h4>
          <div className="university-support-breakdown">
            {supportItems.map(([label, score]) => (
              <span key={label}>
                <strong>{label}</strong>
                <small>{score.toFixed(1)}</small>
              </span>
            ))}
          </div>
          <p className="university-calculation-note">
            Ente regionale di riferimento: {item.support.agency}. {item.support.note}
          </p>
        </section>
      </div>
    </details>
  );
}

export function UniversityResultCard({ item, index }: { item: FinderApiResult; index: number }) {
  const costCity = item.cost.online ? 'corso a distanza' : `${formatCurrency(item.cost.cityCost.monthly)}/mese stimati`;
  const commutePrecision = item.geography.commute?.precision === 'region' ? ' · stima basata sul centro regionale' : '';
  const geographyDetail =
    item.geography.mode === 'commute'
      ? `Stima con regionali o regionali veloci, senza alta velocità${commutePrecision}`
      : item.geography.sameCity
        ? 'La sede nella città di residenza riceve un piccolo vantaggio'
        : item.geography.online
          ? 'Corso a distanza incluso su richiesta'
          : 'Pendolarismo compatibile e trasferimento hanno lo stesso peso geografico';

  return (
    <article className="university-match-card">
      <div className="university-match-rank">
        <span>{String(index + 1).padStart(2, '0')}</span>
        <strong>{item.total}%</strong>
        <small>affinità</small>
      </div>
      <div className="university-match-content">
        <div className="university-match-heading">
          <div>
            <span className="course-result-group">{item.courseMatch.label}</span>
            <h3>{item.university.name}</h3>
            <p>
              {item.course.name} · {item.course.city || item.university.city}
              {item.cost.online ? ' · a distanza' : ''}
            </p>
          </div>
          <span className="university-type-chip">
            {item.university.category === 'Scuola superiore' ? 'Istituto superiore' : item.university.category}
          </span>
        </div>

        <div className="university-match-metrics">
          <article>
            <span>Ranking</span>
            <strong>{item.rankingText}</strong>
            <small>{rankingSourceText(item)}</small>
          </article>
          <article>
            <span>Geografia</span>
            <strong>{item.geography.label}</strong>
            <small>{geographyDetail}</small>
          </article>
          <article>
            <span>Costo orientativo</span>
            <strong>
              {costCity} · retta media {formatCurrency(item.cost.tuition)}/anno
            </strong>
            <small>Totale annuo stimato {formatCurrency(item.cost.annual)}; non è un preventivo personale</small>
          </article>
          <article>
            <span>Lingua</span>
            <strong>{item.language.label}</strong>
            <small>Da confermare nella scheda ufficiale</small>
          </article>
        </div>

        <ul className="university-match-reasons">
          <li>
            Corso: <strong>{item.courseMatch.score}%</strong> · {item.courseMatch.label.toLowerCase()}.
          </li>
          <li>
            Ranking ufficiale: <strong>{item.ranking.score.toFixed(1)}%</strong>.
          </li>
          <li>
            Sostenibilità: <strong>{item.cost.score.toFixed(1)}%</strong>.
          </li>
          <li>
            Borse e sostegni: <strong>{item.support.score.toFixed(1)}%</strong>.
          </li>
        </ul>

        {item.cost.needsAid ? (
          <div className="university-aid-warning">
            <strong>Questa opzione può restare valida, ma il costo è impegnativo per la fascia ISEE indicata.</strong>
            <p>
              La presenza relativa di borse ed esoneri attenua la penalizzazione, senza garantire l’idoneità. Verifica
              requisiti e scadenze sul canale ufficiale.
            </p>
            <a href={scholarshipLink(item)} target="_blank" rel="noreferrer">
              Apri la pagina ufficiale delle borse
            </a>
          </div>
        ) : null}

        <CalculationDetails item={item} />

        <div className="university-match-actions">
          <a className="button button-primary" href={courseLink(item)} target="_blank" rel="noreferrer">
            Apri il corso ufficiale
          </a>
          <a className="button button-secondary" href={scholarshipLink(item)} target="_blank" rel="noreferrer">
            Borse ufficiali
          </a>
          <Link className="text-button" href={scholarshipInternalLink(item)}>
            Verifica la borsa con il tuo profilo
          </Link>
        </div>
      </div>
    </article>
  );
}
