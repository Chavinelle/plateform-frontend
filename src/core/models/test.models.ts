/** QCM (corrigés automatiquement), question ouverte et exercice de code (corrigés par le recruteur). */
export type TestQuestionType = 'QCM_UNIQUE' | 'QCM_MULTIPLE' | 'TEXTE' | 'CODE';

export const QUESTION_TYPES: { value: TestQuestionType; label: string }[] = [
  { value: 'QCM_UNIQUE', label: 'QCM – réponse unique' },
  { value: 'QCM_MULTIPLE', label: 'QCM – réponses multiples' },
  { value: 'TEXTE', label: 'Question ouverte' },
  { value: 'CODE', label: 'Exercice de code' }
];

export const QUESTION_TYPE_LABELS: Record<TestQuestionType, string> = {
  QCM_UNIQUE: 'QCM – réponse unique',
  QCM_MULTIPLE: 'QCM – réponses multiples',
  TEXTE: 'Question ouverte',
  CODE: 'Exercice de code'
};

export function isChoice(type: TestQuestionType): boolean {
  return type === 'QCM_UNIQUE' || type === 'QCM_MULTIPLE';
}

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 10;
export const MAX_TEST_QUESTIONS = 50;

export interface TestOption {
  id: number;
  label: string;
  correct: boolean;
}

export interface TestQuestion {
  id: number;
  type: TestQuestionType;
  statement: string;
  points: number;
  category: string | null;
  archived: boolean;
  /** Nombre de tests qui contiennent la question. */
  usedInTests: number;
  /** Dans un test déjà envoyé à un candidat : plus modifiable. */
  locked: boolean;
  options: TestOption[];
  createdAt: string;
  updatedAt: string;
}

export interface TestQuestionRequest {
  type: TestQuestionType;
  statement: string;
  points: number;
  category: string | null;
  options: { label: string; correct: boolean }[];
}

export interface OnlineTest {
  id: number;
  title: string;
  instructions: string | null;
  durationMinutes: number;
  archived: boolean;
  /** Déjà envoyé à un candidat : plus modifiable. */
  locked: boolean;
  questionCount: number;
  totalPoints: number;
  questions: TestQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface OnlineTestRequest {
  title: string;
  instructions: string | null;
  durationMinutes: number;
  questionIds: number[];
}

// ----- Envoi et passage des tests (7.6) -----

export type TestAttemptStatus = 'ENVOYE' | 'COMMENCE' | 'TERMINE' | 'EXPIRE' | 'CORRIGE';

export const ATTEMPT_STATUS_LABELS: Record<TestAttemptStatus, string> = {
  ENVOYE: 'Envoyé',
  COMMENCE: 'En cours',
  TERMINE: 'Terminé',
  EXPIRE: 'Expiré',
  CORRIGE: 'Corrigé'
};

/** Passage d'un test, vu par le recruteur. */
export interface TestAttemptView {
  id: number;
  testId: number;
  testTitle: string;
  status: TestAttemptStatus;
  deadline: string;
  durationMinutes: number;
  startedAt: string | null;
  mustFinishBy: string | null;
  submittedAt: string | null;
  questionCount: number;
  autoScore: number | null;
  manualScore: number | null;
  maxScore: number | null;
  /** Rempli une fois le passage entièrement corrigé. */
  scorePercent: number | null;
  /** Questions ouvertes ou code qui attendent encore une note. */
  ungradedCount: number;
  sentByName: string | null;
  createdAt: string;
}

export interface SendTestRequest {
  testId: number;
  deadlineDays: number;
  message: string | null;
}

/** Test vu par le candidat ; les questions n'arrivent qu'une fois le test commencé. */
export interface PublicTestView {
  status: TestAttemptStatus;
  title: string;
  instructions: string | null;
  companyName: string;
  jobTitle: string;
  candidateFirstName: string;
  durationMinutes: number;
  deadline: string;
  questionCount: number;
  totalPoints: number;
  startedAt: string | null;
  submittedAt: string | null;
  /** Temps restant selon le serveur (test en cours uniquement). */
  remainingSeconds: number | null;
  questions: PublicTestQuestion[];
}

export interface PublicTestQuestion {
  answerId: number;
  type: TestQuestionType;
  statement: string;
  points: number;
  options: { id: number; label: string }[];
  selectedOptionIds: number[];
  answerText: string | null;
}

export interface TestAnswerInput {
  answerId: number;
  selectedOptionIds: number[];
  answerText: string | null;
}

// ----- Correction (7.7) -----

/** Réponses d'un passage remis (vue interne : bonnes réponses et commentaires des correcteurs). */
export interface TestAttemptDetail {
  attempt: TestAttemptView;
  answers: TestAnswerReview[];
}

export interface TestAnswerReview {
  answerId: number;
  type: TestQuestionType;
  statement: string;
  points: number;
  options: { id: number; label: string; correct: boolean; selected: boolean }[];
  answerText: string | null;
  /** QCM juste ou non ; null pour une question corrigée à la main. */
  autoCorrect: boolean | null;
  pointsAwarded: number | null;
  graderComment: string | null;
}

export interface GradeAnswerRequest {
  points: number;
  comment: string | null;
}
