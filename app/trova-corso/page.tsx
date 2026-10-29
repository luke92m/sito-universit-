import type { Metadata } from 'next';
import { FinderPage } from '@/components/finder/FinderPage';

// Pagina uguale per tutti: su Cloudflare la serve la cache Workers, rigenerata al massimo ogni ora.
export const revalidate = 3600;

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
