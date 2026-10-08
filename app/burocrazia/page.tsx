import type { Metadata } from 'next';
import { Bureaucracy } from '@/components/tools/Bureaucracy';

export const metadata: Metadata = {
  title: 'Burocrazia',
  description: 'Checklist orientativa per l’immatricolazione: accesso, documenti, contribuzione e fonti ufficiali.'
};

export default function BurocraziaPage() {
  return (
    <main>
      <section className="student-tool-shell">
        <Bureaucracy />
      </section>
    </main>
  );
}
