import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Preparation } from '@/components/tools/Preparation';
import { isEnabled } from '@/lib/features';

// Pagina uguale per tutti: su Cloudflare la serve la cache Workers, rigenerata al massimo ogni ora.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Preparazione',
  description: 'Esercizi originali per allenarsi ai test d’ingresso universitari.'
};

export default function PreparazionePage() {
  // Funzione spenta (lib/features.ts): la burocrazia spiega comunque tipo di accesso e test.
  if (!isEnabled('preparazione')) redirect('/burocrazia');
  return (
    <main>
      <section className="student-tool-shell">
        <Preparation />
      </section>
    </main>
  );
}
