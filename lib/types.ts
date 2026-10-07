// Tipi condivisi tra dati statici, logica di dominio e interfaccia.

export interface University {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  city: string;
  province: string;
  region: string;
  macroArea: string;
  category: string;
  isPublic: boolean;
  qsRank: string | number | null;
  qsRankValue: number | null;
  qsScore: number | null;
}

export interface Course {
  id: string;
  universityId: string;
  name: string;
  classCode: string;
  className: string;
  group: string;
  area: string;
  access: string;
  delivery: string;
  city: string;
  enrolled: number;
  /** triennale | magistrale | ciclo-unico | altro */
  level: string;
}

export interface GroupStats {
  courseCount: number;
  enrolled: number;
  share: number;
  index: number;
  rank: number;
  rankedUniversities: number;
}

export interface UniversityMetrics {
  tuitionPayers?: number;
  tuitionAllStudents?: number;
  students?: number;
  scholarshipsUniversityMur?: number;
  mobilityOut?: number;
  mobilityIn?: number;
  housingAssigned?: number;
  housingContributions?: number;
  fullExemptions?: number;
  partialExemptions?: number;
  canteens?: number;
  canteenPlaces?: number;
  residencesDirect?: number;
  residencePlacesDirect?: number;
  residencesPartner?: number;
  residencePlacesPartner?: number;
}

export type Weights = Partial<Record<string, number>>;

export interface QuizOption {
  value: string;
  label: string;
  hint: string;
  weights: Weights;
}

export interface QuizQuestion {
  id: string;
  title: string;
  description: string;
  type: 'single' | 'multiple';
  max?: number;
  options: QuizOption[];
}

export interface CourseProfile {
  slug: string;
  name: string;
  group: string;
  description: string;
  objective: string;
  subjects: string[];
  keywords: string[];
  classCodes: string[];
  weights: Weights;
}

export type ScoreVector = Record<string, number>;

export interface Range {
  value: string;
  label: string;
  min: number | null;
  max: number | null;
}

export interface RegionalPortal {
  name: string;
  url: string;
}

export interface TestArea {
  id: string;
  label: string;
  tolc: string;
  groups: string[];
}

export interface TestQuestion {
  section: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface QsRecord {
  rank?: number;
  band?: [number, number];
  score?: number;
}

export interface SubjectSelection {
  subject: string;
  weight: number;
}
