import { JobStatus } from './company.models';

export type JobReportReason = 'FRAUDULEUSE' | 'DISCRIMINATOIRE' | 'TROMPEUSE' | 'AUTRE';
export type JobReportStatus = 'OUVERT' | 'CLASSE' | 'RETENU';
export type ModerationAction = 'CLASSER' | 'RETIRER' | 'RETABLIR';

export const REPORT_REASONS: { value: JobReportReason; label: string; hint: string }[] = [
  { value: 'FRAUDULEUSE', label: 'Offre frauduleuse', hint: 'arnaque, frais demandés, fausse entreprise' },
  { value: 'DISCRIMINATOIRE', label: 'Contenu discriminatoire', hint: 'âge, sexe, origine, religion, handicap…' },
  { value: 'TROMPEUSE', label: 'Informations trompeuses', hint: 'salaire, poste ou conditions inexacts' },
  { value: 'AUTRE', label: 'Autre problème', hint: '' }
];

export const REPORT_REASON_LABELS: Record<JobReportReason, string> = {
  FRAUDULEUSE: 'Frauduleuse',
  DISCRIMINATOIRE: 'Discriminatoire',
  TROMPEUSE: 'Trompeuse',
  AUTRE: 'Autre'
};

export const REPORT_STATUS_LABELS: Record<JobReportStatus, string> = {
  OUVERT: 'À traiter',
  CLASSE: 'Classé sans suite',
  RETENU: 'Offre retirée'
};

export interface JobReportGroup {
  jobId: number;
  jobTitle: string;
  companyId: number;
  companyName: string;
  jobStatus: JobStatus;
  moderatedAt: string | null;
  moderationReason: string | null;
  openCount: number;
  reports: { id: number; reason: JobReportReason; comment: string | null; status: JobReportStatus; reporterKnown: boolean; createdAt: string }[];
}
