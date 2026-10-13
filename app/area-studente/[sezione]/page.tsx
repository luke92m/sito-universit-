import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AreaPage } from '@/components/area/AreaPage';
import { SECTION_META, activeSections, isActiveSection, type SectionKey } from '@/lib/area-sections';

const isSection = (value: string): value is SectionKey => Object.prototype.hasOwnProperty.call(SECTION_META, value);

export function generateStaticParams() {
  return activeSections().map((sezione) => ({ sezione }));
}

export async function generateMetadata({ params }: { params: Promise<{ sezione: string }> }): Promise<Metadata> {
  const { sezione } = await params;
  return {
    title: isSection(sezione) ? SECTION_META[sezione].title : 'Area personale',
    description: 'Area personale per salvare borse di studio, scadenze e dati del percorso.',
    robots: { index: false }
  };
}

export default async function AreaStudentePage({ params }: { params: Promise<{ sezione: string }> }) {
  const { sezione } = await params;
  if (!isSection(sezione)) notFound();
  // Sezione esistente ma spenta (lib/features.ts): si torna alle borse, la prima sezione utile.
  if (!isActiveSection(sezione)) redirect('/area-studente/borse-di-studio');
  return (
    <main>
      <section className="area-shell">
        {/* useSearchParams nelle sezioni (es. ?ateneo= nelle borse) richiede un confine Suspense. */}
        <Suspense fallback={null}>
          <AreaPage section={sezione} />
        </Suspense>
      </section>
    </main>
  );
}
