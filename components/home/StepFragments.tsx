import Link from 'next/link';
import { COURSE_CATALOG } from '@/lib/data/course-catalog';
import { getUniversityById } from '@/lib/data';
import { choiceCalendar } from '@/lib/domain/choice-calendar';
import { realCost } from '@/lib/domain/real-cost';
import { formatDate } from '@/lib/site-config';

// I quattro passi del percorso, ognuno con un pezzo della sua pagina vera: la prima domanda del test,
// i motivi di un risultato, due costi reali calcolati e il calendario di un ateneo.
const QUIZ = COURSE_CATALOG.questions;
const ISEE = { min: 13000.01, max: 16000 };
const NO_ISPE = { min: null, max: null };
const euro = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' }).format(
    Math.round(value)
  );

function costFor(id: string) {
  const university = getUniversityById(id);
  if (!university) return null;
  const cost = realCost(university, null, ISEE, NO_ISPE, 'fuoriSede');
  return { name: university.shortName, total: cost.total };
}

export function StepFragments() {
  const first = QUIZ[0];
  const pair = [costFor('ateneo-03701'), costFor('ateneo-02801')].filter((item) => item !== null);
  const calendar = choiceCalendar('ateneo-01502').slice(0, 3);
  const polimi = getUniversityById('ateneo-01502');

  return (
    <ol className="th-steps">
      <li>
        <Link className="th-card" href="/trova-corso">
          <div className="th-card__visual" aria-hidden="true" data-ui>
            <div className="th-frag">
              <p className="th-frag__meta">Domanda 1 di {QUIZ.length}</p>
              <p className="th-frag__title">{first.title}</p>
              {first.options.slice(0, 3).map((option, index) => (
                <span key={option.label} className={`th-frag__option${index === 1 ? ' is-on' : ''}`}>
                  {option.label}
                </span>
              ))}
            </div>
          </div>
          <div className="th-card__text">
            <span className="th-card__num">1</span>
            <h3>Rispondi a sei domande</h3>
            <p>Sui tuoi interessi, non sui voti. Ne escono i corsi che ti somigliano.</p>
          </div>
        </Link>
      </li>
      <li>
        <Link className="th-card" href="/trova-corso?mode=university">
          <div className="th-card__visual" aria-hidden="true" data-ui>
            <div className="th-frag">
              <p className="th-frag__meta">Perché te lo proponiamo</p>
              {['Il corso che cerchi', 'La distanza da casa', 'Il ranking della materia', 'Il costo con la borsa'].map(
                (reason) => (
                  <span key={reason} className="th-frag__check">
                    <svg viewBox="0 0 24 24">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                    {reason}
                  </span>
                )
              )}
            </div>
          </div>
          <div className="th-card__text">
            <span className="th-card__num">2</span>
            <h3>Scegli tra gli atenei adatti</h3>
            <p>Ogni risultato dice perché è lì: corso, distanza, ranking e costo.</p>
          </div>
        </Link>
      </li>
      <li>
        <Link className="th-card" href="/comparison">
          <div className="th-card__visual" aria-hidden="true" data-ui>
            <div className="th-frag">
              <p className="th-frag__meta">Fuori sede, ISEE fino a 16.000 €</p>
              <div className="th-frag__pair">
                {pair.map((item) => (
                  <div key={item.name}>
                    <span>{item.name}</span>
                    <strong>{euro(item.total.min)}</strong>
                  </div>
                ))}
              </div>
              <p className="th-frag__meta">Costo reale del primo anno, borsa tolta</p>
            </div>
          </div>
          <div className="th-card__text">
            <span className="th-card__num">3</span>
            <h3>Confronta costi e ranking</h3>
            <p>Due atenei fianco a fianco, con le stesse condizioni e le fonti sotto.</p>
          </div>
        </Link>
      </li>
      <li>
        <Link className="th-card" href="/burocrazia">
          <div className="th-card__visual" aria-hidden="true" data-ui>
            <div className="th-frag">
              <p className="th-frag__meta">Calendario {polimi?.shortName ?? ''}</p>
              {calendar.map((item) => (
                <span key={item.id} className="th-frag__row">
                  <span>{item.title}</span>
                  <span>{item.date ? formatDate(item.date, { day: 'numeric', month: 'short' }) : 'da pubblicare'}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="th-card__text">
            <span className="th-card__num">4</span>
            <h3>Preparati all’iscrizione</h3>
            <p>Test d’ingresso, ISEE e domanda di borsa, con le date dei bandi ufficiali.</p>
          </div>
        </Link>
      </li>
    </ol>
  );
}
