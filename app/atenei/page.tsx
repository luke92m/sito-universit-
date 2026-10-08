import type { Metadata } from 'next';
import { AteneiCatalog } from '@/components/atenei/AteneiCatalog';
import { catalogEntries, departmentGroups } from '@/lib/domain/catalog';

export const metadata: Metadata = {
  title: 'Atenei',
  description: 'Catalogo degli istituti universitari italiani con ranking ufficiali QS e CENSIS e aree disciplinari.'
};

export default function AteneiPage() {
  const entries = catalogEntries();
  return (
    <main>
      <section className="page-hero compact" aria-labelledby="catalogTitle">
        <span className="eyebrow">Orientati con ordine</span>
        <h1 id="catalogTitle">
          {entries.length} istituti universitari,
          <br />
          un solo punto di partenza.
        </h1>
        <p className="page-lead">
          Esplora gli atenei in ordine alfabetico, per regione, secondo ranking ufficiali QS e CENSIS oppure per area
          disciplinare.
        </p>
      </section>

      <section className="catalog-section" aria-label="Catalogo degli atenei">
        <AteneiCatalog entries={entries} departments={departmentGroups()} />

        <p className="source-note">
          <strong>Nota sui dati.</strong> L’anagrafica deriva dagli Open Data USTAT del Ministero dell’Università e della
          Ricerca. Il ranking generale usa la{' '}
          <a href="https://www.qs.com/insights/qs-world-university-rankings" target="_blank" rel="noreferrer">
            QS World University Rankings 2027
          </a>
          ; in assenza di QS viene mostrata la{' '}
          <a
            href="https://www.censis.it/la-classifica-censis-delle-universita-italiane-edizione-2026-2027-2/"
            target="_blank"
            rel="noreferrer"
          >
            Classifica CENSIS 2026/2027
          </a>{' '}
          nella categoria omogenea dell’ateneo. Il filtro “Dipartimento” usa QS per materia e, quando non disponibile, il
          CENSIS della didattica o il CENSIS generale. Non vengono più usati indici interni come ranking. Fonte
          anagrafica:{' '}
          <a
            href="https://dati-ustat.mur.gov.it/dataset/metadati/resource/a332a119-6c4b-44f5-80eb-3aca45a9e8e8"
            target="_blank"
            rel="noreferrer"
          >
            Open Data MUR — Atenei
          </a>
          .
        </p>
      </section>
    </main>
  );
}
