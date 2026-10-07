import type { Metadata } from 'next';
import { ComparisonTool } from '@/components/comparison/ComparisonTool';
import type { University } from '@/lib/types';
import { comparisonUniversities, defaultUniversityId, preferredCourseId } from '@/lib/domain/comparison';

export const metadata: Metadata = {
  title: 'Comparison',
  description: 'Confronta due atenei o due corsi con ranking ufficiali, costi, borse e qualità della vita.'
};

const summary = ({ id, name, shortName, city, region, isPublic, category }: University) => ({
  id,
  name,
  shortName,
  city,
  region,
  isPublic,
  category
});

export default async function ComparisonPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const leftId = defaultUniversityId('Bologna', 0);
  const rightId = defaultUniversityId('Padova', 1);
  const courseLeftUniversity = defaultUniversityId('Bologna', 0, true);
  const courseRightUniversity = defaultUniversityId('Padova', 1, true);

  return (
    <main>
      <section className="page-hero compact comparison-page-hero" aria-labelledby="comparisonTitle">
        <span className="eyebrow">Metti le alternative una accanto all’altra</span>
        <h1 id="comparisonTitle">
          Confronta ciò
          <br />
          che conta davvero.
        </h1>
        <p className="page-lead">
          Scegli se comparare due atenei oppure due corsi, anche all’interno della stessa università.
        </p>
      </section>

      <ComparisonTool
        universities={comparisonUniversities().map(summary)}
        universitiesWithCourses={comparisonUniversities(true).map(summary)}
        defaults={{
          leftId,
          rightId,
          courseLeftUniversityId: courseLeftUniversity,
          courseRightUniversityId: courseRightUniversity,
          courseLeftId: preferredCourseId(courseLeftUniversity, 'economia-aziendale'),
          courseRightId: preferredCourseId(courseRightUniversity, 'economia-aziendale')
        }}
        initialMode={mode === 'courses' ? 'courses' : 'universities'}
      />
    </main>
  );
}
