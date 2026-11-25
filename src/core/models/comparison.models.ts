import { ApplicationStatus } from './application.models';
import { InterviewOpinion } from './interview.models';
import { TestAttemptStatus } from './test.models';

/** Comparaison de 2 à 4 candidats d'une offre ; criteriaAverages est aligné sur criteria. */
export interface ApplicationComparison {
  jobId: number;
  jobTitle: string;
  criteria: string[];
  candidates: ComparedCandidate[];
}

export interface ComparedCandidate {
  applicationId: number;
  candidateName: string;
  headline: string | null;
  status: ApplicationStatus;
  stageName: string | null;
  rating: number | null;
  tags: string[];
  appliedAt: string;
  interviewsDone: number;
  /** false : RG10 masque les évaluations de ce candidat (soumettre d'abord la sienne). */
  evaluationsVisible: boolean;
  submittedCount: number;
  globalScore: number | null;
  /** Moyenne sur 5 par critère, null si non noté ; vide si masqué. */
  criteriaAverages: (number | null)[];
  /** Vide si masqué. */
  opinions: Partial<Record<InterviewOpinion, number>>;
  tests: { testId: number; testTitle: string; status: TestAttemptStatus; scorePercent: number | null }[];
}

export const MIN_COMPARE = 2;
export const MAX_COMPARE = 4;
