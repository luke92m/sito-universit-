import type { FinderAnswers } from '@/lib/domain/university-finder';

export declare const FINDER_CASES: { name: string; answers: FinderAnswers; options?: Record<string, boolean> }[];
export declare const COURSE_ANSWER_CASES: Record<string, string | string[]>[];
export declare const RANKING_COURSE_SAMPLES: number;
export declare const COMPARISON_UNIVERSITY_PAIRS: [string, string][];
export declare const COMPARISON_COURSE_CASES: [string, number | string, string, number | string, boolean][];
export declare const COMPARISON_VECTOR_ANSWERS: Record<string, string | string[]>;
