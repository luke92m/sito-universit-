import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scuole e aziende',
  description: 'Uno spazio di incontro tra università, scuole e aziende.'
};

const CARDS = [
  ['01', 'Scuole', 'Incontri, percorsi di orientamento e materiali dedicati.'],
  ['02', 'Aziende', 'Partnership, testimonianze e progetti per gli studenti.'],
  ['03', 'Opportunità', 'Eventi, esperienze e collegamenti con il mondo del lavoro.']
];

export default function SchoolsCompaniesPage() {
  return (
    <main>
      <section className="coming-section">
        <span className="eyebrow">Connessioni utili</span>
        <div className="page-hero" style={{ width: '100%', padding: 0 }}>
          <h1>
            Scuole, università
            <br />e lavoro si incontrano.
          </h1>
          <p className="page-lead">
            La sezione è pronta per ospitare orientamento nelle scuole, collaborazioni, progetti e opportunità offerte dalle
            aziende.
          </p>
        </div>
        <div className="coming-grid">
          {CARDS.map(([number, title, copy]) => (
            <article className="coming-card" key={number}>
              <span className="coming-number">{number}</span>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
