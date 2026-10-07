import Link from 'next/link';
import { ProfileCtaButton } from '@/components/home/ProfileCtaButton';
import { Icon } from '@/components/site/Icons';
import { UNIVERSITIES } from '@/lib/data';

const JOURNEY = [
  ['01', 'Scopri', 'Trova i corsi più vicini ai tuoi interessi'],
  ['02', 'Preparati', 'Test, metodo e primi passi'],
  ['03', 'Organizzati', 'Scadenze, borse e materiali'],
  ['04', 'Confrontati', 'Community e accompagnamento']
];

export default function HomePage() {
  return (
    <main>
      <section className="hero" aria-labelledby="heroTitle">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker">orientamento · studio · opportunità</span>
            <h1 id="heroTitle">
              L’università,
              <br />
              spiegata <em>semplice.</em>
            </h1>
            <p className="hero-subtitle">Dalla matricola alla laurea: qui trovi le risposte.</p>

            <div className="hero-actions">
              <Link className="button button-primary" href="/atenei">
                Esplora gli atenei
                <Icon name="arrow" />
              </Link>
              <Link className="button button-secondary" href="/trova-corso">
                Trova il mio corso
              </Link>
              <ProfileCtaButton />
            </div>

            <div className="hero-proof" aria-label="Caratteristiche principali">
              <span className="proof-chip">{UNIVERSITIES.length} istituti universitari</span>
              <span className="proof-chip">questionario di orientamento</span>
              <span className="proof-chip">comparatore personalizzato</span>
            </div>
          </div>

          <aside className="journey-card" aria-label="Esempio di percorso universitario">
            <p className="journey-label">Il tuo percorso, in ordine</p>
            <ol className="journey-list">
              {JOURNEY.map(([number, title, copy]) => (
                <li className="journey-item" key={number}>
                  <span className="journey-number">{number}</span>
                  <span className="journey-copy">
                    <strong>{title}</strong>
                    <span>{copy}</span>
                  </span>
                  <span className="journey-status" aria-hidden="true" />
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      <section className="home-strip" aria-label="Contenuti del sito">
        <div className="strip-grid">
          <div className="strip-item">
            <strong>Scopri</strong>
            <span>quali corsi sono più vicini ai tuoi interessi.</span>
          </div>
          <div className="strip-item">
            <strong>Capisci</strong>
            <span>procedure e opportunità senza perderti.</span>
          </div>
          <div className="strip-item">
            <strong>Affronta</strong>
            <span>ogni passaggio con informazioni ordinate.</span>
          </div>
        </div>
      </section>

      <section className="about-section" id="chi-siamo" aria-labelledby="aboutTitle">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Il progetto</span>
            <h2 id="aboutTitle">Chi siamo?</h2>
          </div>

          <div className="about-placeholder">
            <span className="placeholder-label">Testo da definire</span>
            <h3>Questo spazio è pronto per raccontare chi c’è dietro al progetto.</h3>
            <p>
              Qui potrai inserire in futuro la storia, la missione, i valori e il motivo per cui il sito aiuta studenti e
              futuri studenti.
            </p>
            <div className="placeholder-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
