import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FlowSteps } from '@/components/flow/FlowSteps';
import { NeutralityNote } from '@/components/site/NeutralityNote';
import { ScholarshipCheck } from '@/components/tools/ScholarshipCheck';

export const metadata: Metadata = {
  title: 'Borse di studio',
  description: 'Verifica orientativa della borsa di studio per il diritto allo studio, con ISEE e residenza, senza account.'
};

export default function BorsePage() {
  return (
    <main>
      <section className="student-tool-shell">
        <FlowSteps current={2} />
        <section className="tool-hero tool-hero-compact">
          <div>
            <span className="eyebrow">Diritto allo studio</span>
            <h1>Con il mio ISEE prendo la borsa?</h1>
            <p>
              Una verifica orientativa sulle soglie nazionali, con il collegamento al bando dell’ente della regione
              dell’ateneo. Non serve un account.
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
