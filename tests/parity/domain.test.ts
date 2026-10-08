import { describe, expect, it } from 'vitest';
import { UNIVERSITIES, DATASET, getCourses } from '@/lib/data';
import { matchCourse, rankCourses, vectorFromAnswers } from '@/lib/domain/course-catalog';
import { censisGeneral, forCourse, forGroup, general } from '@/lib/domain/official-rankings';
import { profile } from '@/lib/domain/university-profiles';
import { rankCandidates, targetFromChoice, type FinderAnswers } from '@/lib/domain/university-finder';
import { RANKING_COURSE_SAMPLES } from './cases.mjs';
import { fixture, plain } from './helpers';

type FinderFixture = { name: string; answers: FinderAnswers; options?: Record<string, boolean>; results: unknown[] };

describe('parità con la v8: Trova la mia università', () => {
  for (const testCase of fixture<FinderFixture[]>('finder.json')) {
    it(testCase.name, () => {
      const target = targetFromChoice(testCase.answers.courseChoice);
      expect(target).not.toBeNull();
      const results = rankCandidates(target!, testCase.answers, testCase.options || {}).slice(0, 30);
      expect(plain(results)).toEqual(testCase.results);
    });
  }
});

describe('parità con la v8: Trova il mio corso', () => {
  const cases = fixture<{ answers: Record<string, string | string[]>; vector: unknown; ranked: unknown }[]>('course-finder.json');
  cases.forEach((testCase, index) => {
    it(`risposte #${index}`, () => {
      const vector = vectorFromAnswers(testCase.answers);
      expect(vector).toEqual(testCase.vector);
      expect(rankCourses(vector).map((course) => ({ slug: course.slug, score: course.score }))).toEqual(testCase.ranked);
    });
  });
});

describe('parità con la v8: ranking ufficiali', () => {
  type RankingFixture = {
    id: string;
    general: unknown;
    censisGeneral: unknown;
    groups: unknown[];
    courses: { courseId: string; matched: string | null; ranking: unknown }[];
  };
  const expected = new Map(fixture<RankingFixture[]>('rankings.json').map((row) => [row.id, row]));

  for (const university of UNIVERSITIES) {
    it(university.shortName, () => {
      const row = expected.get(university.id)!;
      expect(plain(general(university))).toEqual(row.general);
      expect(plain(censisGeneral(university))).toEqual(row.censisGeneral);
      expect(plain(DATASET.groups.map((group) => forGroup(university, group)))).toEqual(row.groups);
      const courses = getCourses(university.id).filter((_course, index) => index % RANKING_COURSE_SAMPLES === 0);
      expect(
        plain(
          courses.map((course) => ({
            courseId: course.id,
            matched: matchCourse(course)?.slug || null,
            ranking: forCourse(university, course)
          }))
        )
      ).toEqual(row.courses);
    });
  }
});

describe('parità con la v8: schede ateneo', () => {
  it('tutte le 99 schede', () => {
    expect(plain(UNIVERSITIES.map((university) => profile(university)))).toEqual(fixture('profiles.json'));
  });
});
