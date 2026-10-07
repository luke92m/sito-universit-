import type { Metadata } from 'next';
import { FinderPage } from '@/components/finder/FinderPage';

export const metadata: Metadata = {
  title: 'Trova il mio corso',
  description: 'Questionario di orientamento per trovare il corso di laurea e l’università più adatti a te.'
};

export default function TrovaCorsoPage() {
  return (
    <main>
      <FinderPage />
    </main>
  );
}
