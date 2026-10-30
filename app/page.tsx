import Link from 'next/link';
import { ProfileCtaButton } from '@/components/home/ProfileCtaButton';
import { Icon } from '@/components/site/Icons';
import { UNIVERSITIES } from '@/lib/data';
import { isEnabled } from '@/lib/features';
import { FLOW_STEPS } from '@/components/flow/FlowSteps';
import { scholarshipEntities, universitiesWithScholarship, universitiesWithTuition } from '@/lib/domain/coverage';

// Pagina uguale per tutti: su Cloudflare la serve la cache Workers, rigenerata al massimo ogni ora.
export const revalidate = 3600;

const STEP_COPY = [
  'Sei domande sui tuoi interessi, senza account',
  'Gli atenei adatti a te, con il perché di ogni risultato',
  'Ranking, costi e borse fianco a fianco, con le fonti',
  'Accesso, documenti e bandi ufficiali'
];

const PRINCIPLES = [
  ['Neutrale', 'Nessun ateneo paga per comparire nei risultati o per la sua posizione.'],
  ['Con le fonti', 'Ogni numero ha accanto da dove viene: MUR, QS, CENSIS, ISTAT, bandi regionali.'],
  [
    'Senza account',
    isEnabled('account')
      ? 'Puoi fare tutto il percorso senza registrarti. L’account serve solo per salvare.'
      : 'Puoi fare tutto il percorso senza registrarti: le tue scelte restano solo nel tuo browser.'
  ]
];

export default function HomePage() {
  const tuition = universitiesWithTuition();
  const entities = scholarshipEntities();
  const scholarshipCount = universitiesWithScholarship().length;
  return (
    <main>
      <section className="hero" aria-labelledby="heroTitle">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker">scegliere l’università · costi reali · borse di studio</span>
            <h1 id="heroTitle">
              Scopri quale università
              <br />
              <em>fa per te.</em>
            </h1>
            <p className="hero-subtitle">E quanto ti costa davvero, borsa compresa.</p>

            <div className="hero-actions">
              <Link className="button button-primary" href="/trova-corso">
                Inizia: trova la tua università
                <Icon name="arrow" />
              </Link>
              <Link className="button button-secondary" href="/comparison">
                Confronta due atenei
              </Link>
              {isEnabled('account') ? <ProfileCtaButton /> : null}
            </div>

            <div className="hero-proof" aria-label="Caratteristiche principali">
              <span className="proof-chip">{UNIVERSITIES.length} istituti universitari</span>
              <span className="proof-chip">{tuition.length} atenei con costi verificati</span>
              <span className="proof-chip">nessun ateneo paga per comparire</span>
              <span className="proof-chip">nessun account obbligatorio</span>
            </div>
          </div>

          <aside className="journey-card" aria-label="Il percorso di scelta">
            <p className="journey-label">Il percorso, in quattro passi</p>
            <ol className="journey-list">
              {FLOW_STEPS.map((step, index) => (
                <li className="journey-item" key={step.label}>
                  <span className="journey-number">{String(index + 1).padStart(2, '0')}</span>
                  <Link className="journey-copy" href={step.href}>
                    <strong>{step.label}</strong>
                    <span>{STEP_COPY[index]}</span>
                  </Link>
                  <span className="journey-status" aria-hidden="true" />
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      <section className="home-strip" aria-label="Come funziona il sito">
        <div className="strip-grid">
          {PRINCIPLES.map(([title, copy]) => (
            <div className="strip-item" key={title}>
              <strong>{title}</strong>
              <span>{copy}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-catalog-link" aria-label="Catalogo">
        <p>
          Vuoi solo curiosare? <Link href="/atenei">Esplora tutti i {UNIVERSITIES.length} atenei</Link> con schede e
          ranking ufficiali.
        </p>
      </section>

      <section className="about-section" id="dati" aria-labelledby="coverageTitle">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Dati verificati</span>
            <h2 id="coverageTitle">Cosa trovi oggi.</h2>
          </div>

          <div className="home-coverage-card">
            <ul>
              <li>
                <strong>Tasse per ISEE di {tuition.length} atenei</strong>
                <span>{tuition.map((university) => university.name).join(', ')}.</span>
              </li>
              <li>
                <strong>
                  Borse di {entities.length} bandi regionali per {scholarshipCount} atenei
                </strong>
                <span>{[...new Set(entities.map((entity) => entity.region))].join(', ')}.</span>
              </li>
              <li>
                <strong>Per tutti gli altri atenei</strong>
                <span>Tasse medie nazionali, sempre segnate come stima. Li aggiungiamo uno alla volta.</span>
              </li>
            </ul>
            <div className="inline-actions">
              <Link className="button button-secondary" href="/metodo">
                Come calcoliamo i costi
              </Link>
              <Link className="text-button" href="/atenei">
                Esplora gli atenei
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
