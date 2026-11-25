import { ApplicationSource, ApplicationStatus } from './application.models';
import { StageKind } from './company.models';

export type Granularity = 'DAY' | 'WEEK' | 'MONTH';

/** Indicateurs de recrutement (GET /company/stats). Candidatures : reçues sur la période ; embauches : prononcées sur la période. */
export interface RecruitmentStats {
  period: { from: string; to: string; granularity: Granularity; jobId: number | null; jobTitle: string | null };
  totals: { applications: number; inProgress: number; hired: number; rejected: number; withdrawn: number; publishedJobs: number };
  byStatus: { status: ApplicationStatus; count: number }[];
  bySource: { source: ApplicationSource; count: number }[];
  byJob: { jobId: number; title: string; applications: number; hired: number }[];
  /** Offre choisie seulement. */
  byStage: { stageId: number; name: string; kind: StageKind; current: number; reached: number }[];
  timeline: { start: string; applications: number }[];
  timeToHire: { hires: number; averageDays: number | null; medianDays: number | null; minDays: number | null; maxDays: number | null };
  conversion: { key: string; label: string; count: number; rate: number | null; fromPrevious: number | null }[];
}

export interface StatsQuery {
  from?: string;
  to?: string;
  jobId?: number | null;
}
