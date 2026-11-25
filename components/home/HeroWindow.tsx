import { getUniversityById } from '@/lib/data';
import { GRANT_KEYS } from '@/lib/domain/real-cost-keys';
import { realCost } from '@/lib/domain/real-cost';

// La finestra del hero è il simulatore vero: un conto calcolato con le regole 2026/27 di UniBo e del bando ER.GO,
// rifatto a ogni build. Se i dati cambiano, cambia anche la home.
const UNIVERSITY_ID = 'ateneo-03701';
const ISEE = { min: 13000.01, max: 16000 };
const NO_ISPE = { min: null, max: null };

const euro = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' }).format(
    Math.round(value)
  );

const amount = (min: number, max: number) => (Math.round(min) === Math.round(max) ? euro(min) : `${euro(min)}–${euro(max)}`);

export function HeroWindow() {
  const university = getUniversityById(UNIVERSITY_ID);
  if (!university) return null;
  const cost = realCost(university, null, ISEE, NO_ISPE, 'fuoriSede');
  const costs = cost.lines.filter((line) => !GRANT_KEYS.includes(line.key));
  const grants = cost.lines.filter((line) => GRANT_KEYS.includes(line.key));

  return (
    <div className="th-window" role="group" aria-label={`Esempio di calcolo per ${university.name}`}>
      <p className="th-window__case">Primo anno a {university.shortName}, da fuori sede</p>
      <div className="th-window__body">
        <div className="th-window__main">
          <p className="th-window__profile">
            <span>ISEE 13.000–16.000 €</span>
            <span>{cost.conditionLabel}</span>
            {cost.entity ? <span>Bando {cost.entity.shortName}</span> : null}
          </p>
          <ul className="th-window__lines">
            {costs.map((line) => (
              <li key={line.key}>
                <span>
                  {line.label}
                  {line.estimated ? <small> stima</small> : null}
                </span>
                <span>{amount(line.min, line.max)}</span>
              </li>
            ))}
            {grants.map((line) => (
              <li key={line.key} className="is-grant">
                <span>{line.label}</span>
                <span>− {amount(line.min, line.max)}</span>
              </li>
            ))}
          </ul>
          <div className="th-window__total">
            <span>Costo reale in un anno</span>
            <strong>{amount(cost.total.min, cost.total.max)}</strong>
          </div>
          <p className="th-window__source">
            Tasse dalle regole 2026/27 di {university.shortName}
            {cost.entity ? `, borsa dal bando ${cost.entity.shortName} 2026/27` : ''}. Affitto e spese di vita sono stime.
          </p>
        </div>
      </div>
    </div>
  );
}
