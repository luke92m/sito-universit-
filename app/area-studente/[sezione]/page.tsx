import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { AreaPage } from '@/components/area/AreaPage';
import { SECTION_META, type SectionKey } from '@/lib/area-sections';

const isSection = (value: string): value is SectionKey => Object.prototype.hasOwnProperty.call(SECTION_META, value);

export function generateStaticParams() {
  return Object.keys(SECTION_META).map((sezione) => ({ sezione }));
}

export async function generateMetadata({ params }: { params: Promise<{ sezione: string }> }): Promise<Metadata> {
  const { sezione } = await params;
  return {
    title: isSection(sezione) ? SECTION_META[sezione].title : 'Area personale',
    description: 'Area personale per borse di studio, scadenze, community, accompagnamento e libri usati.',
    robots: { index: false }
  };
}

export default async function AreaStudentePage({ params }: { params: Promise<{ sezione: string }> }) {
  const { sezione } = await params;
  if (!isSection(sezione)) notFound();
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
