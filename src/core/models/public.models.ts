import { ContractType } from './candidate.models';
import { ExperienceLevel, RemotePolicy } from './company.models';

export interface PublicJobSummary {
  id: number;
  title: string;
  companyId: number;
  companyName: string;
  companySector: string | null;
  companyHasLogo: boolean;
  city: string | null;
  country: string | null;
  contractType: ContractType | null;
  experienceLevel: ExperienceLevel | null;
  remotePolicy: RemotePolicy;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  deadline: string | null;
  publishedAt: string;
  skills: string[];
  excerpt: string | null;
}

export interface PublicCompanyCard {
  id: number;
  name: string;
  sector: string | null;
  size: string | null;
  country: string | null;
  city: string | null;
  hasLogo: boolean;
}

export interface PublicJobDetail {
  id: number;
  title: string;
  company: PublicCompanyCard;
  description: string | null;
  missions: string | null;
  requiredProfile: string | null;
  benefits: string | null;
  contractType: ContractType | null;
  experienceLevel: ExperienceLevel | null;
  city: string | null;
  country: string | null;
  remotePolicy: RemotePolicy;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  positionsCount: number;
  deadline: string | null;
  publishedAt: string;
  skills: string[];
  questionsCount: number;
}

export interface PublicCompanyProfile {
  id: number;
  name: string;
  sector: string | null;
  size: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  description: string | null;
  coreValues: string | null;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  xUrl: string | null;
  hasLogo: boolean;
  hasBanner: boolean;
  activeJobsCount: number;
}

export interface PublicFilters {
  sectors: string[];
  countries: string[];
}

export interface JobSearchParams {
  q?: string;
  city?: string;
  country?: string;
  sector?: string;
  contractType?: ContractType[];
  experienceLevel?: ExperienceLevel[];
  remotePolicy?: RemotePolicy[];
  salaryMin?: number;
  currency?: string;
  postedWithinDays?: number;
  companyId?: number;
  sort?: 'RECENT' | 'RELEVANCE';
  page?: number;
  size?: number;
}
