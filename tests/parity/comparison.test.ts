import { describe, expect, it } from 'vitest';
import { compareCourses, compareUniversities, comparisonCourses, type ComparisonValue } from '@/lib/domain/comparison';
import { matchCourse, vectorFromAnswers } from '@/lib/domain/course-catalog';
import type { Inline } from '@/lib/domain/rich-text';
import { COMPARISON_COURSE_CASES, COMPARISON_VECTOR_ANSWERS } from './cases.mjs';
import { fixture } from './helpers';

type LegacyRow = { label: string; hint: string; left: string; right: string };

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

// Ricostruisce l'HTML che la v8 generava per un valore, a partire dalla struttura Rich.
function inlineToHtml(item: Inline): string {
  switch (item.t) {
    case 'text':
      return escapeHtml(item.text);
    case 'strong':
      return `<strong>${escapeHtml(item.text)}</strong>`;
    case 'link':
      return `<a class="comparison-data-link" href="${escapeHtml(item.href.replace(/^\/api\//, 'api/'))}" target="_blank" rel="noreferrer">${escapeHtml(item.text)}</a>`;
    case 'chip':
      return `<span class="comparison-subject-chip">${escapeHtml(item.text)}</span>`;
    case 'br':
      return '<br>';
    case 'p':
      return `<p${item.className ? ` class="${item.className}"` : ''}>${item.children.map(inlineToHtml).join('')}</p>`;
  }
}

function valueToHtml(value: ComparisonValue): string {
  const tag = value.tag
    ? `<span class="comparison-source-tag${value.tag === 'Da integrare' ? ' is-pending' : ''}">${escapeHtml(value.tag)}</span>`
    : '';
  const note = value.note.length ? `<small>${value.note.map(inlineToHtml).join('')}</small>` : '';
  return `<div class="comparison-value"><strong>${value.value.map(inlineToHtml).join('')}</strong>${note}${tag}</div>`;
}

const squash = (html: string) => html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();

function expectSameRows(actual: { label: string; hint: string; left: ComparisonValue; right: ComparisonValue }[], expected: LegacyRow[]) {
  expect(actual.map((row) => [row.label, row.hint])).toEqual(expected.map((row) => [row.label, row.hint || '']));
  actual.forEach((row, index) => {
    expect(squash(valueToHtml(row.left))).toBe(squash(expected[index].left));
    expect(squash(valueToHtml(row.right))).toBe(squash(expected[index].right));
  });
}

describe('parità con la v8: comparison tra atenei', () => {
  for (const testCase of fixture<{ leftId: string; rightId: string; rows: LegacyRow[] | null }[]>(
    'comparison-universities.json'
  )) {
    it(`${testCase.leftId} vs ${testCase.rightId}`, () => {
      const result = compareUniversities(testCase.leftId, testCase.rightId);
      if (!testCase.rows) {
        expect(result).toEqual({ error: 'Scegli due università diverse.' });
        return;
      }
      expect(result && 'rows' in result).toBe(true);
      if (result && 'rows' in result) expectSameRows(result.rows, testCase.rows);
    });
  }
});

describe('parità con la v8: comparison tra corsi', () => {
  type CourseFixture = {
    leftId: string;
    leftCourseId: string;
    rightId: string;
    rightCourseId: string;
    withVector: boolean;
    scenario: string;
    rows: LegacyRow[] | null;
  };
  const vector = vectorFromAnswers(COMPARISON_VECTOR_ANSWERS);
  const fixtures = fixture<CourseFixture[]>('comparison-courses.json');

  it('seleziona gli stessi corsi campione', () => {
    const resolve = (universityId: string, selector: number | string) => {
      const courses = comparisonCourses(universityId);
      if (typeof selector === 'number') return courses[selector % courses.length].id;
      return (courses.find((course) => matchCourse(course)?.slug === selector) || courses[0]).id;
    };
    expect(
      COMPARISON_COURSE_CASES.map(([leftId, left, rightId, right]) => [resolve(leftId, left), resolve(rightId, right)])
    ).toEqual(fixtures.map((item) => [item.leftCourseId, item.rightCourseId]));
  });

  for (const testCase of fixtures) {
    it(`${testCase.leftCourseId} vs ${testCase.rightCourseId}`, () => {
      const result = compareCourses(
        testCase.leftId,
        testCase.leftCourseId,
        testCase.rightId,
        testCase.rightCourseId,
        testCase.withVector ? vector : null
      );
      if (testCase.scenario === 'error') {
        expect(result).toEqual({ error: 'Scegli due corsi diversi.' });
        return;
      }
      expect(result && 'rows' in result).toBe(true);
      if (result && 'rows' in result) {
        expect(result.scenario).toBe(testCase.scenario);
        expectSameRows(result.rows, testCase.rows!);
      }
    });
  }
});
