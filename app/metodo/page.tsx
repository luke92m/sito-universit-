import type { Metadata } from 'next';
import Link from 'next/link';
import { CITY_SOURCES } from '@/lib/domain/city-indicators';
import { scholarshipEntities, tuitionSources, universitiesWithScholarship } from '@/lib/domain/coverage';
import { formatDate, NEUTRALITY_TEXT, SITE_CONFIG } from '@/lib/site-config';

// Pagina uguale per tutti: su Cloudflare la serve la cache Workers, rigenerata al massimo ogni ora.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Come calcoliamo i costi',
  description:
    'Da dove vengono i numeri del costo reale: regolamenti delle tasse degli atenei, bandi regionali delle borse, affitti e spese con fonti nazionali.'
};

const MUR_CONTRIBUTION = 'https://dati-ustat.mur.gov.it/dataset/2025-contribuzione-e-interventi-atenei';

// Pagina di metodo: l'elenco delle fonti è generato dai dati, così resta allineato a ciò che il sito usa davvero.
export default function MethodPage() {
  const tuition = tuitionSources();
  const entities = scholarshipEntities();
  const scholarshipCount = universitiesWithScholarship().length;

  return (
    <main className="legal-page method-page">
      <article>
        <span className="eyebrow">Metodo e fonti</span>
        <h1>Come calcoliamo quanto ti costa davvero</h1>
        <p className="page-lead">
          Un numero per il primo anno, con accanto la fonte di ogni voce. Qui trovi cosa entra nel calcolo, da dove viene
          ogni dato e cosa invece è una stima.
        </p>

        <h2>La formula</h2>
        <p>
          <strong>Costo del primo anno</strong> = tasse universitarie + tassa regionale, bollo e assicurazione + (se sei
          fuori sede) affitto di una camera e spese di vita − borsa di studio − servizi gratuiti compresi nella borsa
          (mensa, alloggio).
        </p>
        <p>
          Se sei pendolare o vivi nella città della sede, trasporti e spese personali non sono stimati: il totale comprende
          solo tasse e borsa, e lo diciamo accanto al numero. Quando la borsa supera i costi calcolati, indichiamo quanto
          avanza invece di mostrare un costo negativo.
        </p>

        <h2>Tasse per fascia ISEE: {tuition.length} atenei</h2>
        <p>
          Calcolate con le regole ufficiali del regolamento tasse di ogni ateneo (fasce, formule, massimi per corso,
          riduzioni). Chi è idoneo alla borsa non paga le tasse, come prevede la legge nazionale (D.Lgs. 68/2012, art. 9).
        </p>
        <ul className="method-sources">
          {tuition.map((item) => (
            <li key={item.universityId}>
              <strong>{item.university}</strong> · {item.academicYear} · verificato il {formatDate(item.verifiedAt)} ·{' '}
              <a href={item.source.url} target="_blank" rel="noreferrer">
                {item.source.label}
              </a>
              {item.estimatedBetweenBands ? (
                <small> Il regolamento dà solo gli estremi delle fasce: tra gli estremi l’importo è una stima lineare.</small>
              ) : null}
            </li>
          ))}
        </ul>
        <p>
          <strong>Per tutti gli altri atenei</strong> mostriamo la contribuzione media pagata dagli iscritti (
          <a href={MUR_CONTRIBUTION} target="_blank" rel="noreferrer">
            MUR, contribuzione e interventi 2025
          </a>
          ): non dipende dal tuo ISEE ed è sempre segnata come stima, con l’etichetta «tasse: media nazionale».
        </p>

        <h2>Borse di studio: {entities.length} bandi regionali, {scholarshipCount} atenei</h2>
        <p>
          Soglie ISEE e ISPE, importi per condizione (fuori sede, pendolare, in sede) e servizi gratuiti vengono dal bando
          ufficiale dell’ente per il diritto allo studio. Se l’ISEE è vicino alla soglia, il sito non decide al posto tuo:
          ti dice che serve il valore esatto.
        </p>
        <ul className="method-sources">
          {entities.map((entity) => (
            <li key={entity.id}>
              <strong>{entity.shortName}</strong> ({entity.region}) · {entity.academicYear} · verificato il{' '}
              {formatDate(entity.verifiedAt)} ·{' '}
              <a href={entity.source.url} target="_blank" rel="noreferrer">
                {entity.source.label}
              </a>
            </li>
          ))}
        </ul>
        <p>
          Per gli altri atenei il bando non è ancora nel sito: la borsa <strong>non</strong> viene sottratta e
          lo segnaliamo con «bando della borsa non ancora nel sito». In quei casi il costo reale può essere molto più basso
          del numero mostrato.
        </p>

        <h2>Affitto e spese di vita (solo fuori sede)</h2>
        <ul className="method-sources">
          <li>
            <strong>Camera singola:</strong> prezzo medio della città della sede o, se manca, della zona ·{' '}
            <a href={CITY_SOURCES.rent} target="_blank" rel="noreferrer">
              Immobiliare.it Insights 2026
            </a>
            . È una stima: con un posto alloggio dell’ente regionale la retta è più bassa ed è tolta dalla borsa.
          </li>
          <li>
            <strong>Cibo, trasporti, utenze e spese personali:</strong> 24% della spesa media mensile di una famiglia nella
            macroarea della sede ·{' '}
            <a href={CITY_SOURCES.spending} target="_blank" rel="noreferrer">
              ISTAT, spese per consumi delle famiglie 2024
            </a>
            . È una stima.
          </li>
        </ul>

        <h2>Cosa non è il costo reale</h2>
        <p>
          Non è un preventivo e non sostituisce il bando: importi, scadenze e requisiti (anche di merito) vanno sempre
          controllati sulle pagine ufficiali che colleghiamo. I dati economici che inserisci servono solo al calcolo e non
          vengono salvati né condivisi.
        </p>
        <p>{NEUTRALITY_TEXT}</p>

        <h2>Hai trovato un errore?</h2>
        <p>
          Ogni numero ha una fonte e una data di verifica: se un regolamento o un bando è cambiato, o un calcolo non
          torna,{' '}
          {SITE_CONFIG.contactEmail ? (
            <>
              scrivici a <a href={`mailto:${SITE_CONFIG.contactEmail}`}>{SITE_CONFIG.contactEmail}</a> indicando ateneo,
              fascia ISEE e voce.
            </>
          ) : (
            <>segnalacelo indicando ateneo, fascia ISEE e voce: lo correggiamo citando la nuova fonte.</>
          )}{' '}
          Puoi anche <Link href="/borse">rifare il calcolo voce per voce</Link>.
        </p>
      </article>
    </main>
  );
}
