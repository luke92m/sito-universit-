import type { Metadata } from 'next';
import { ComparisonTool } from '@/components/comparison/ComparisonTool';
import { FlowSteps } from '@/components/flow/FlowSteps';
import { getCourse } from '@/lib/data';
import { comparisonUniversities, defaultUniversityId, preferredCourseId } from '@/lib/domain/comparison';
import { matchCourse } from '@/lib/domain/course-catalog';
import { isCourseId, universityOfCourse } from '@/lib/flow/journey-params';
import type { University } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Comparatore',
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

/** Corso scelto nel finder e passato nel link (?a=<idCorso>&b=<idCorso>), se esiste nel dataset. */
function linkedCourse(value: string | string[] | undefined) {
  const courseId = typeof value === 'string' && isCourseId(value) ? value : '';
  const universityId = universityOfCourse(courseId);
  const course = courseId ? getCourse(universityId, courseId) : null;
  return course ? { universityId, courseId, slug: matchCourse(course)?.slug || '' } : null;
}

export default async function ComparisonPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string; a?: string | string[]; b?: string | string[] }>;
}) {
  const { mode, a, b } = await searchParams;
  const left = linkedCourse(a);
  const right = linkedCourse(b);
  const fromLink = Boolean(left && right);

  const leftId = defaultUniversityId('Bologna', 0);
  const rightId = defaultUniversityId('Padova', 1);
  const courseLeftUniversity = left?.universityId || defaultUniversityId('Bologna', 0, true);
  const courseRightUniversity = right?.universityId || defaultUniversityId('Padova', 1, true);

  return (
    <main>
      <section className="page-hero compact comparison-page-hero" aria-labelledby="comparisonTitle">
        <FlowSteps current={2} />
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
          courseLeftId: left?.courseId || preferredCourseId(courseLeftUniversity, 'economia-aziendale'),
          courseRightId: right?.courseId || preferredCourseId(courseRightUniversity, 'economia-aziendale'),
          courseLeftSlug: left?.slug || 'economia-aziendale',
          courseRightSlug: right?.slug || 'economia-aziendale'
        }}
        initialMode={fromLink || mode === 'courses' ? 'courses' : 'universities'}
        autoCompare={fromLink}
      />
    </main>
  );
}
