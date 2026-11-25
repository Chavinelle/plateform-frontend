import { PersonRef } from './company.models';

export type InterviewType = 'TELEPHONE' | 'VISIO' | 'PRESENTIEL';
export type InterviewStatus = 'PROPOSE' | 'CONFIRME' | 'REPORTE' | 'REALISE' | 'ANNULE' | 'ABSENT';
export type InterviewCandidateResponse = 'ACCEPTE' | 'REFUSE' | 'AUTRE_CRENEAU';

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  TELEPHONE: 'Téléphone',
  VISIO: 'Visioconférence',
  PRESENTIEL: 'Présentiel'
};

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  PROPOSE: 'Proposé',
  CONFIRME: 'Confirmé',
  REPORTE: 'Reporté',
  REALISE: 'Réalisé',
  ANNULE: 'Annulé',
  ABSENT: 'Absent'
};

export const INTERVIEW_RESPONSE_LABELS: Record<InterviewCandidateResponse, string> = {
  ACCEPTE: 'Accepté',
  REFUSE: 'Refusé',
  AUTRE_CRENEAU: 'Autre créneau proposé'
};

export const INTERVIEW_DURATIONS = [15, 30, 45, 60, 90, 120, 180] as const;

/** Entretien vu par l'entreprise. Les dates sont en heure locale (« 2026-11-25T10:00:00 »). */
export interface InterviewView {
  id: number;
  /** Version vue par l'utilisateur : renvoyée lors d'un report ou d'une annulation (409 si elle a changé). */
  version: number;
  applicationId: number;
  type: InterviewType;
  status: InterviewStatus;
  startsAt: string;
  durationMinutes: number;
  endsAt: string;
  location: string | null;
  meetingUrl: string | null;
  candidateMessage: string | null;
  participants: PersonRef[];
  candidateResponse: InterviewCandidateResponse | null;
  candidateComment: string | null;
  candidateProposedAt: string | null;
  respondedAt: string | null;
  /** Motif interne d'annulation (RG7). */
  cancelReason: string | null;
  createdByName: string;
  createdAt: string;
}

export interface InterviewRequest {
  type: InterviewType;
  /** Valeur d'un champ datetime-local : « 2026-11-25T10:00 ». */
  startsAt: string;
  durationMinutes: number;
  location: string | null;
  meetingUrl: string | null;
  candidateMessage: string | null;
  participantIds: number[];
}

/** Entretien vu par le candidat (sans les participants ni les informations internes). */
export interface CandidateInterview {
  id: number;
  version: number;
  type: InterviewType;
  status: InterviewStatus;
  startsAt: string;
  durationMinutes: number;
  endsAt: string;
  location: string | null;
  meetingUrl: string | null;
  candidateMessage: string | null;
  candidateResponse: InterviewCandidateResponse | null;
  candidateComment: string | null;
  candidateProposedAt: string | null;
  respondedAt: string | null;
  canRespond: boolean;
}

export interface InterviewAnswerRequest {
  version: number;
  response: InterviewCandidateResponse;
  comment: string | null;
  /** Obligatoire pour AUTRE_CRENEAU (valeur d'un champ datetime-local). */
  proposedAt: string | null;
}

export interface InterviewRescheduleRequest extends InterviewRequest {
  version: number;
}

export interface InterviewCancelRequest {
  version: number;
  /** Interne (RG7) : jamais envoyé au candidat. */
  reason: string;
  candidateMessage: string | null;
}

/** Entretien dans l'agenda de l'entreprise. */
export interface CalendarInterview {
  id: number;
  applicationId: number;
  candidateName: string;
  jobTitle: string;
  type: InterviewType;
  status: InterviewStatus;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  location: string | null;
  meetingUrl: string | null;
  participants: PersonRef[];
}

/** Entretien dans l'agenda du candidat. */
export interface CandidateCalendarItem {
  id: number;
  applicationId: number;
  jobTitle: string;
  companyName: string;
  type: InterviewType;
  status: InterviewStatus;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  location: string | null;
  meetingUrl: string | null;
}

export type InterviewOpinion = 'TRES_FAVORABLE' | 'FAVORABLE' | 'DEFAVORABLE' | 'TRES_DEFAVORABLE';

export const INTERVIEW_OPINION_LABELS: Record<InterviewOpinion, string> = {
  TRES_FAVORABLE: 'Très favorable',
  FAVORABLE: 'Favorable',
  DEFAVORABLE: 'Défavorable',
  TRES_DEFAVORABLE: 'Très défavorable'
};

export interface InterviewReportView {
  id: number;
  authorName: string;
  opinion: InterviewOpinion;
  content: string;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
}

/** RG10 : tant que je n'ai pas rendu mon compte rendu, ceux des autres sont masqués (hiddenCount). */
export interface InterviewReportsResponse {
  mine: InterviewReportView | null;
  others: InterviewReportView[];
  hiddenCount: number;
  canWrite: boolean;
}

export interface InterviewReportRequest {
  opinion: InterviewOpinion;
  content: string;
}
