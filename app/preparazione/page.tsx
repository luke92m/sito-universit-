import type { Metadata } from 'next';
import { Preparation } from '@/components/tools/Preparation';

export const metadata: Metadata = {
  title: 'Preparazione',
  description: 'Esercizi originali per allenarsi ai test d’ingresso universitari.'
};

export default function PreparazionePage() {
  return (
    <main>
      <section className="student-tool-shell">
        <Preparation />
      </section>
    </main>
  );
}
