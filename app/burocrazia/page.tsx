import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FlowSteps } from '@/components/flow/FlowSteps';
import { Bureaucracy } from '@/components/tools/Bureaucracy';

// Pagina uguale per tutti: su Cloudflare la serve la cache Workers, rigenerata al massimo ogni ora.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Burocrazia',
  description: 'Checklist orientativa per l’immatricolazione: accesso, documenti, contribuzione e fonti ufficiali.'
};

export default function BurocraziaPage() {
  return (
    <main>
      <section className="student-tool-shell">
        <FlowSteps current={3} />
        {/* useSearchParams (?ateneo=&corso=) richiede un confine Suspense nelle pagine statiche. */}
        <Suspense fallback={null}>
          <Bureaucracy />
        </Suspense>
      </section>
    </main>
  );
}
