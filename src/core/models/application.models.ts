import { ContractType, DocumentItem, Education, Experience, Language, Skill } from './candidate.models';
import { PersonRef, QuestionType, Stage, StageKind } from './company.models';

export type ApplicationStatus = 'RECUE' | 'EN_COURS' | 'EMBAUCHEE' | 'REJETEE' | 'RETIREE';

export interface ApplicationOption {
  id: number;
  label: string;
}

export interface ApplicationQuestion {
  id: number;
  label: string;
  type: QuestionType;
  required: boolean;
  options: ApplicationOption[];
}

export interface ApplicationFormData {
  jobId: number;
  jobTitle: string;
  companyName: string;
  deadline: string | null;
  alreadyApplied: boolean;
  applicationId: number | null;
  questions: ApplicationQuestion[];
  documents: DocumentItem[];
}

export interface AnswerPayload {
  questionId: number;
  text?: string;
  optionIds?: number[];
}

export interface ApplyRequest {
  cvDocumentId: number | null;
  coverLetterDocumentId: number | null;
  coverLetter: string | null;
  answers: AnswerPayload[];
  consent: boolean;
}

export interface ApplicationSummary {
  id: number;
  jobId: number;
  jobTitle: string;
  companyName: string;
  status: ApplicationStatus;
  stageName: string;
  appliedAt: string;
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  RECUE: 'Reçue',
  EN_COURS: 'En cours d\'examen',
  EMBAUCHEE: 'Embauché(e)',
  REJETEE: 'Non retenue',
  RETIREE: 'Retirée'
};

export type ApplicationDocumentKind = 'CV' | 'LETTRE';

export interface MyApplicationItem {
  id: number;
  jobId: number;
  jobTitle: string;
  companyId: number;
  companyName: string;
  companyHasLogo: boolean;
  city: string | null;
  country: string | null;
  status: ApplicationStatus;
  stageName: string | null;
  appliedAt: string;
  updatedAt: string;
  jobAvailable: boolean;
  canWithdraw: boolean;
}

export interface ApplicationAnswerView { question: string; answers: string[]; }
export interface ApplicationDocumentView { id: number; kind: ApplicationDocumentKind; originalName: string; sizeBytes: number; }
export interface HistoryEntryView {
  date: string;
  label: string;
  stageName: string | null;
  status: ApplicationStatus | null;
  /** Message que l'entreprise vous a adressé (ex. lors d'un refus). */
  message: string | null;
}

export interface MyApplicationDetail {
  id: number;
  jobId: number;
  jobTitle: string;
  companyId: number;
  companyName: string;
  companyHasLogo: boolean;
  city: string | null;
  country: string | null;
  jobAvailable: boolean;
  status: ApplicationStatus;
  stageName: string | null;
  appliedAt: string;
  updatedAt: string;
  canWithdraw: boolean;
  coverLetter: string | null;
  answers: ApplicationAnswerView[];
  documents: ApplicationDocumentView[];
  history: HistoryEntryView[];
}

export interface SavedJobItem {
  jobId: number;
  title: string;
  companyId: number;
  companyName: string;
  companyHasLogo: boolean;
  city: string | null;
  country: string | null;
  contractType: ContractType | null;
  deadline: string | null;
  savedAt: string;
  available: boolean;
  applied: boolean;
}

// ---- Côté recruteur (phase 5) ----

export type ApplicationSource = 'PLATEFORME' | 'COOPTATION' | 'MANUEL' | 'RESEAUX_SOCIAUX' | 'AUTRE' | 'VIVIER';

export const APPLICATION_SOURCE_LABELS: Record<ApplicationSource, string> = {
  PLATEFORME: 'Plateforme',
  COOPTATION: 'Cooptation',
  MANUEL: 'Ajout manuel',
  RESEAUX_SOCIAUX: 'Réseaux sociaux',
  AUTRE: 'Autre',
  VIVIER: 'Vivier de talents'
};

/** Origines possibles d'un candidat ajouté par le recruteur. */
export const MANUAL_SOURCES: readonly ApplicationSource[] = ['COOPTATION', 'MANUEL', 'RESEAUX_SOCIAUX', 'AUTRE'];

export interface ManualApplicationRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  headline: string | null;
  source: ApplicationSource;
  referredBy: string | null;
  comment: string | null;
  consent: boolean;
}

export interface ManualApplicationResponse {
  applicationId: number;
  /** L'adresse correspondait déjà à un compte candidat : la candidature y a été rattachée. */
  existingAccount: boolean;
  message: string;
}

export type RecruiterApplicationSort = 'RECENT' | 'OLDEST' | 'NAME' | 'BEST_RATED';

export const RECRUITER_SORT_LABELS: Record<RecruiterApplicationSort, string> = {
  RECENT: 'Plus récentes',
  OLDEST: 'Plus anciennes',
  NAME: 'Nom du candidat',
  BEST_RATED: 'Mieux notées'
};

/** Filtres de la liste, réutilisés tels quels pour l'export. */
export interface RecruiterApplicationFilters {
  q?: string;
  status?: ApplicationStatus;
  stageId?: number;
  knockout?: boolean;
  minRating?: number;
  tag?: string;
  sort: RecruiterApplicationSort;
}

export interface RecruiterApplicationQuery extends RecruiterApplicationFilters {
  page: number;
  size: number;
}

export type ExportFormat = 'CSV' | 'XLSX';

export interface RecruiterApplicationItem {
  id: number;
  candidateId: number;
  candidateName: string;
  headline: string | null;
  city: string | null;
  country: string | null;
  skills: string[];
  status: ApplicationStatus;
  stageId: number | null;
  stageName: string | null;
  stageColor: string | null;
  source: ApplicationSource;
  knockoutFlagged: boolean;
  rating: number | null;
  tags: string[];
  appliedAt: string;
  updatedAt: string;
  cv: ApplicationDocumentView | null;
  /** Score global des évaluations (sur 100), null si aucune évaluation soumise ou si masqué. */
  score: number | null;
  /** RG10 : masqué tant que je dois encore soumettre ma propre évaluation. */
  scoreHidden: boolean;
}

export interface CandidateSnapshot {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  headline: string | null;
  summary: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  languages: Language[];
}

export interface RecruiterAnswerView { question: string; answers: string[]; knockoutFailed: boolean; }

export interface RecruiterHistoryEntry {
  date: string;
  fromStageName: string | null;
  toStageName: string | null;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
  authorName: string | null;
  reason: string | null;
  candidateMessage: string | null;
}

export interface RecruiterApplicationDetail {
  id: number;
  jobId: number;
  jobTitle: string;
  status: ApplicationStatus;
  stageId: number | null;
  stageName: string | null;
  stageColor: string | null;
  source: ApplicationSource;
  knockoutFlagged: boolean;
  rating: number | null;
  tags: string[];
  appliedAt: string;
  updatedAt: string;
  withdrawnAt: string | null;
  candidate: CandidateSnapshot;
  coverLetter: string | null;
  answers: RecruiterAnswerView[];
  documents: ApplicationDocumentView[];
  history: RecruiterHistoryEntry[];
  canManage: boolean;
}

export interface MoveStageRequest {
  stageId: number;
  expectedStageId: number | null;
  reason: string | null;
  notifyCandidate?: boolean;
  candidateMessage?: string | null;
}

/** Ce que le recruteur décide au moment d'un rejet. */
export interface RejectDecision {
  reason: string;
  notifyCandidate: boolean;
  candidateMessage: string | null;
}

/** to = null pour un modèle d'envoi groupé. */
export interface CandidateMessage { to: string | null; subject: string; body: string; }

export interface BulkMoveRequest {
  applicationIds: number[];
  stageId: number;
  reason: string | null;
  notifyCandidate?: boolean;
  candidateMessage?: string | null;
}

export interface BulkMoveResponse {
  moved: number;
  failures: { applicationId: number; candidateName: string | null; reason: string }[];
}

/** Motifs de rejet fréquents, proposés pour aller plus vite (le texte reste modifiable). */
export const REJECTION_REASONS: string[] = [
  'Profil ne correspondant pas aux attentes du poste',
  'Expérience insuffisante',
  'Compétences techniques insuffisantes',
  'Critère éliminatoire non rempli',
  'Prétentions salariales trop éloignées',
  'Poste pourvu par un autre candidat',
  'Candidat injoignable'
];

export interface JobBoard {
  jobId: number;
  jobTitle: string;
  canManage: boolean;
  stages: Stage[];
  cards: RecruiterApplicationItem[];
  total: number;
  truncated: boolean;
}

/** Même règle que le serveur : le statut découle du type d'étape. */
export const STATUS_FOR_STAGE_KIND: Record<StageKind, ApplicationStatus> = {
  ENTREE: 'RECUE',
  STANDARD: 'EN_COURS',
  EMBAUCHE: 'EMBAUCHEE',
  REJET: 'REJETEE'
};

/** Note interne d'un membre de l'équipe (jamais visible par le candidat). */
export interface ApplicationNote {
  id: number;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  mine: boolean;
  mentions: PersonRef[];
}
