import { InterviewOpinion } from './interview.models';

/** Critère d'une grille ; percent = part dans le score global (poids / total des poids). */
export interface Criterion {
  id: number;
  label: string;
  description: string | null;
  weight: number;
  percent: number;
}

export interface EvaluationTemplate {
  id: number;
  name: string;
  description: string | null;
  defaultTemplate: boolean;
  archived: boolean;
  /** Déjà utilisée par une évaluation : modifier ses critères crée une nouvelle version. */
  used: boolean;
  criteria: Criterion[];
  createdAt: string;
  updatedAt: string;
  /** Renvoyé après une modification qui a créé une nouvelle version. */
  newVersion: boolean;
}

export interface CriterionRequest {
  label: string;
  description: string | null;
  weight: number;
}

export interface EvaluationTemplateRequest {
  name: string;
  description: string | null;
  criteria: CriterionRequest[];
}

export const MAX_CRITERIA = 12;

export type EvaluationStatus = 'BROUILLON' | 'SOUMISE';

export interface EvaluationScoreView {
  id: number;
  label: string;
  weight: number;
  percent: number;
  score: number | null;
  comment: string | null;
}

export interface EvaluationView {
  id: number;
  version: number;
  templateId: number;
  templateName: string;
  evaluatorName: string;
  mine: boolean;
  status: EvaluationStatus;
  opinion: InterviewOpinion | null;
  comment: string | null;
  /** Sur 100, calculé à la soumission. */
  score: number | null;
  submittedAt: string | null;
  interviewId: number | null;
  interviewStartsAt: string | null;
  scores: EvaluationScoreView[];
  updatedAt: string;
}

/** RG10 : tant que je n'ai pas soumis la mienne, others est vide et globalScore null. */
export interface EvaluationsResponse {
  mine: EvaluationView[];
  others: EvaluationView[];
  othersVisible: boolean;
  submittedCount: number;
  globalScore: number | null;
}

export interface EvaluationSaveRequest {
  version: number;
  opinion: InterviewOpinion | null;
  comment: string | null;
  scores: { scoreId: number; score: number | null; comment: string | null }[];
}
