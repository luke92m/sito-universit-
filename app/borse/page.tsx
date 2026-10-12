import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FlowSteps } from '@/components/flow/FlowSteps';
import { NeutralityNote } from '@/components/site/NeutralityNote';
import { ScholarshipCheck } from '@/components/tools/ScholarshipCheck';

export const metadata: Metadata = {
  title: 'Borse di studio',
  description:
    'Borsa di studio e costo reale del primo anno con il tuo ISEE: tasse, casa e borsa con le fonti ufficiali, senza account.'
};

export default function BorsePage() {
  return (
    <main>
      <section className="student-tool-shell">
        <FlowSteps current={2} />
        <section className="tool-hero tool-hero-compact">
          <div>
            <span className="eyebrow">Borsa di studio e costo reale</span>
            <h1>Con il mio ISEE prendo la borsa? E quanto mi costa davvero?</h1>
            <p>
              Tasse con la formula ufficiale dell’ateneo, borsa con il bando dell’ente regionale, casa e spese con fonti
              nazionali: tutto in un numero, con la fonte accanto a ogni voce. Non serve un account.
            </p>
            <p className="verified-coverage">
              <strong>Borse verificate sui bandi ufficiali 2026/27:</strong> Emilia-Romagna (ER.GO), Lazio (DiSCo),
              Piemonte (EDISU), Toscana (DSU), Campania (ADISURC), Università di Padova e Milano-Bicocca.{' '}
              <strong>Tasse per ISEE:</strong> Bologna e Padova. Gli altri atenei li stiamo aggiungendo uno alla volta.
            </p>
          </div>
        </section>
        {/* useSearchParams (?ateneo=&corso=) richiede un confine Suspense nelle pagine statiche. */}
        <Suspense fallback={null}>
          <ScholarshipCheck />
        </Suspense>
        <NeutralityNote />
      </section>
    </main>
  );
}
