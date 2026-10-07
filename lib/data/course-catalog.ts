// Catalogo dei corsi generali e domande del test: leggero, utilizzabile anche nel client.
import catalogJson from './course-catalog.json';
import type { CourseProfile, QuizQuestion } from '../types';

export const COURSE_CATALOG = catalogJson as unknown as {
  dimensions: string[];
  questions: QuizQuestion[];
  courses: CourseProfile[];
};
