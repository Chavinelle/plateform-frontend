import { InterviewStatus, InterviewType } from './interview.models';
import { TestAttemptStatus } from './test.models';

/** Tableau de bord du candidat : uniquement ses données, rien d'interne (RG7). */
export interface CandidateDashboard {
  counts: { total: number; active: number; hired: number; notRetained: number; withdrawn: number };
  profileCompletion: number;
  upcomingInterviews: {
    interviewId: number; applicationId: number; jobTitle: string; companyName: string;
    startsAt: string; durationMinutes: number; type: InterviewType; status: InterviewStatus; needsAnswer: boolean;
  }[];
  pendingTests: {
    applicationId: number; jobTitle: string; companyName: string; testTitle: string;
    status: TestAttemptStatus; deadline: string; mustFinishBy: string | null;
  }[];
  unreadMessages: number;
  unreadThreads: { applicationId: number; jobTitle: string; companyName: string; count: number }[];
  recentActivity: { applicationId: number; jobTitle: string; companyName: string; label: string; at: string }[];
}
