import Link from 'next/link';
import { ProfileCtaButton } from '@/components/home/ProfileCtaButton';
import { HeroWindow } from '@/components/home/HeroWindow';
import { StepFragments } from '@/components/home/StepFragments';
import { WordHighlight } from '@/components/home/WordHighlight';
import { UNIVERSITIES } from '@/lib/data';
import { isEnabled } from '@/lib/features';
import { scholarshipEntities, universitiesWithScholarship, universitiesWithTuition } from '@/lib/domain/coverage';
import { NEUTRALITY_TEXT } from '@/lib/site-config';
import './home.css';

// Pagina uguale per tutti: su Cloudflare la serve la cache Workers, rigenerata al massimo ogni ora.
export const revalidate = 3600;

/*
  Home costruita con tasteskill 2.5.1 (design-taste-frontend).
  Tipo: software (strumento web gratuito). Palette del cliente: petrolio #12505c come unico colore,
  ceruleo #e3f1f6 solo nei fondi, Figtree, niente corsivi (decisione del 27/10/2026).
  Rivista con frontend-design: hero diviso, a destra il conto vero su un pannello petrolio che arriva al bordo.
  Il petrolio sta nelle superfici grandi (pannello, finestre dei passi, fascia dei dati); il rosso Equestrian
  solo sul pulsante dell'azione principale.
*/

export default function HomePage() {
  const tuition = universitiesWithTuition();
  const entities = scholarshipEntities();
  const scholarshipCount = universitiesWithScholarship().length;

  const facts = [
    { value: tuition.length, label: 'atenei con le tasse calcolate sul tuo ISEE' },
    { value: entities.length, label: 'bandi regionali per il diritto allo studio' },
    { value: scholarshipCount, label: 'atenei con la borsa calcolata' },
    { value: UNIVERSITIES.length, label: 'istituti universitari nel catalogo' }
  ];

  return (
    <main id="contenuto" className="th-home">
      <section className="hero--centred th-hero" data-enter aria-labelledby="heroTitle">
        <div className="wrap th-wrap th-hero__inner">
          <div className="th-hero__text">
            <p className="th-pill th-enter-line">Tasse e borse 2026/27 per {tuition.length} atenei</p>
            <h1 id="heroTitle" className="th-enter-line">
              Il costo reale dell’università, borsa compresa
            </h1>
            <p className="hero__lead th-hero__lead th-enter-follow">
              Sei domande per trovare gli atenei adatti a te. Poi tasse per ISEE, affitto e borsa regionale in un solo
              conto, gratis e senza account.
            </p>
            <div className="th-btn-row th-enter-follow">
              <Link className="th-btn th-btn--primary" href="/trova-corso">
                Trova la tua università
              </Link>
              <Link className="th-btn th-btn--secondary" href="/comparison">
                Confronta due atenei
              </Link>
              {isEnabled('account') ? <ProfileCtaButton /> : null}
            </div>
          </div>
          <div className="hero__window th-hero__window">
            <HeroWindow />
          </div>
        </div>
      </section>

      <section className="th-section" id="percorso" aria-labelledby="stepsTitle">
        <div className="wrap th-wrap">
          <h2 id="stepsTitle">
            Quattro passi, dalla prima domanda all’iscrizione
          </h2>
          <StepFragments />
        </div>
      </section>

      <section className="th-section th-ground-inverse" id="dati" aria-labelledby="dataTitle">
        <div className="wrap th-wrap">
          <h2 id="dataTitle">
            Dati ufficiali, con la fonte accanto.{' '}
            <span className="th-muted">Ogni cifra rimanda al documento da cui viene.</span>
          </h2>
          <div className="th-data-grid">
            <dl className="th-facts">
              {facts.map((fact) => (
                <div className="th-fact" key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
            <div
              className="th-formula"
              role="img"
              aria-label="Il costo reale: tasse dell’ateneo più affitto e spese di vita, meno la borsa di studio del bando regionale"
            >
              <p className="th-formula__label">Come si forma il costo reale</p>
              <div className="th-formula__row">
                <span className="th-formula__sign">+</span>
                <span className="th-formula__what">Tasse universitarie</span>
                <span className="th-formula__src">Regolamento dell’ateneo 2026/27</span>
              </div>
              <div className="th-formula__row">
                <span className="th-formula__sign">+</span>
                <span className="th-formula__what">Affitto e spese di vita</span>
                <span className="th-formula__src">Immobiliare.it e ISTAT, come stima</span>
              </div>
              <div className="th-formula__row">
                <span className="th-formula__sign">−</span>
                <span className="th-formula__what">Borsa di studio</span>
                <span className="th-formula__src">Bando regionale 2026/27</span>
              </div>
              <div className="th-formula__row is-total">
                <span className="th-formula__sign">=</span>
                <span className="th-formula__what">Costo reale in un anno</span>
                <span className="th-formula__src">Calcolato sul tuo ISEE</span>
              </div>
            </div>
          </div>
          <div className="th-btn-row">
            <Link className="th-btn th-btn--secondary th-btn--on-dark" href="/metodo">
              Leggi come calcoliamo i costi
            </Link>
            <Link className="th-link th-link--on-dark" href="/atenei">
              Sfoglia i {UNIVERSITIES.length} atenei
            </Link>
          </div>
        </div>
      </section>

      <section className="th-section th-statement statement" id="neutralita" data-moment="word-highlight" aria-label="Le regole del sito">
        <div className="wrap th-wrap">
          <WordHighlight text={NEUTRALITY_TEXT} strong="fonte" />
          <ul className="th-rules">
            <li>
              <strong>Le tue scelte restano a te</strong>
              <span>Risposte e preferenze si salvano solo nel tuo browser. Il calcolo non le conserva.</span>
            </li>
            <li>
              <strong>Le stime si vedono</strong>
              <span>Affitto e spese di vita sono medie ufficiali, e lo diciamo accanto alla cifra.</span>
            </li>
            <li>
              <strong>Un ateneo alla volta</strong>
              <span>Dove mancano le regole ufficiali usiamo la media nazionale, segnata come tale.</span>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
