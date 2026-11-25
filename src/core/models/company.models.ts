import { ContractType } from './candidate.models';

export type CompanyStatus = 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE' | 'SUSPENDUE';

export interface CompanyInfo {
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
  status: CompanyStatus;
  hasLogo: boolean;
  hasBanner: boolean;
}

export type UpdateCompanyRequest = Omit<CompanyInfo, 'id' | 'status' | 'hasLogo' | 'hasBanner'>;

export type CompanyImageSlot = 'logo' | 'banner';

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  EN_ATTENTE: 'En attente de validation',
  VALIDEE: 'Validée',
  REFUSEE: 'Refusée',
  SUSPENDUE: 'Suspendue'
};

export const COMPANY_STATUS_MESSAGES: Partial<Record<CompanyStatus, string>> = {
  EN_ATTENTE: 'Votre entreprise est en attente de validation par un administrateur de la plateforme. '
    + 'Vous pouvez préparer vos offres, mais pas encore les publier.',
  REFUSEE: 'L\'inscription de votre entreprise a été refusée. Contactez l\'administrateur de la plateforme.',
  SUSPENDUE: 'Votre entreprise est suspendue. Contactez l\'administrateur de la plateforme.'
};

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

export type CompanyRole = 'RECRUTEUR' | 'MANAGER' | 'ADMIN_ENTREPRISE';
export type MemberStatus = 'ACTIF' | 'DESACTIVE' | 'SUSPENDU';
export type InvitationStatus = 'EN_ATTENTE' | 'ACCEPTEE' | 'EXPIREE' | 'ANNULEE';

export interface Member {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: MemberStatus;
  emailVerified: boolean;
  createdAt: string;
  you: boolean;
}

export interface Invitation {
  id: number;
  email: string;
  role: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  invitedBy: string;
}

export interface InvitationPreview {
  companyName: string;
  email: string;
  role: string;
}

export interface AcceptInvitationRequest {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface Department {
  id: number;
  name: string;
}

export const COMPANY_ROLES: CompanyRole[] = ['RECRUTEUR', 'MANAGER', 'ADMIN_ENTREPRISE'];

export const COMPANY_ROLE_LABELS: Record<string, string> = {
  RECRUTEUR: 'Recruteur',
  MANAGER: 'Manager',
  ADMIN_ENTREPRISE: 'Administrateur'
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIF: 'Actif',
  DESACTIVE: 'Désactivé',
  SUSPENDU: 'Suspendu'
};

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  EXPIREE: 'Expirée',
  ANNULEE: 'Annulée'
};

export const roleLabel = (role: string): string => COMPANY_ROLE_LABELS[role] ?? role;

export type JobStatus =
  'BROUILLON' | 'EN_ATTENTE_VALIDATION' | 'PUBLIEE' | 'SUSPENDUE' | 'CLOTUREE' | 'POURVUE' | 'ARCHIVEE';
export type ExperienceLevel = 'DEBUTANT' | 'JUNIOR' | 'CONFIRME' | 'SENIOR';
export type RemotePolicy = 'SUR_SITE' | 'HYBRIDE' | 'TELETRAVAIL';
export type QuestionType = 'TEXTE' | 'CHOIX_UNIQUE' | 'CHOIX_MULTIPLE' | 'OUI_NON';
export type StageKind = 'ENTREE' | 'STANDARD' | 'EMBAUCHE' | 'REJET';

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PersonRef { id: number; name: string; }

export interface JobSummary {
  id: number;
  title: string;
  departmentName: string | null;
  contractType: ContractType | null;
  city: string | null;
  country: string | null;
  status: JobStatus;
  deadline: string | null;
  publishedAt: string | null;
  scheduled: boolean;
  viewsCount: number;
  createdByName: string;
  updatedAt: string;
  editable: boolean;
  allowedTransitions: JobStatus[];
  /** Retrait par la modération : l'offre n'est plus publique et ne peut pas être republiée. */
  moderatedAt: string | null;
  moderationReason: string | null;
}

export interface JobDetail {
  id: number;
  title: string;
  departmentId: number | null;
  departmentName: string | null;
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
  publishAt: string | null;
  status: JobStatus;
  publishedAt: string | null;
  scheduled: boolean;
  closedAt: string | null;
  viewsCount: number;
  skills: string[];
  manager: PersonRef | null;
  evaluators: PersonRef[];
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
  allowedTransitions: JobStatus[];
  /** Retrait par la modération : l'offre n'est plus publique et ne peut pas être republiée. */
  moderatedAt: string | null;
  moderationReason: string | null;
}

export interface JobRequest {
  title: string;
  departmentId: number | null;
  description: string | null;
  missions: string | null;
  requiredProfile: string | null;
  benefits: string | null;
  contractType: ContractType | null;
  experienceLevel: ExperienceLevel | null;
  city: string | null;
  country: string | null;
  remotePolicy: RemotePolicy | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  positionsCount: number | null;
  deadline: string | null;
  publishAt: string | null;
  skills: string[];
  managerId: number | null;
  evaluatorIds: number[];
}

export interface QuestionOption { id: number; label: string; accepted: boolean; }

export interface Question {
  id: number;
  label: string;
  type: QuestionType;
  required: boolean;
  knockout: boolean;
  expectedAnswer: string | null;
  options: QuestionOption[];
}

export interface QuestionRequest {
  id: number | null;
  label: string;
  type: QuestionType;
  required: boolean;
  knockout: boolean;
  expectedAnswer: string | null;
  options: { label: string; accepted: boolean }[];
}

export interface Stage {
  id: number;
  name: string;
  sortOrder: number;
  color: string;
  kind: StageKind;
  locked: boolean;
}

export interface StageRequest { id: number | null; name: string; color: string; }

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  BROUILLON: 'Brouillon',
  EN_ATTENTE_VALIDATION: 'En attente de validation',
  PUBLIEE: 'Publiée',
  SUSPENDUE: 'Suspendue',
  CLOTUREE: 'Clôturée',
  POURVUE: 'Pourvue',
  ARCHIVEE: 'Archivée'
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  DEBUTANT: 'Débutant', JUNIOR: 'Junior', CONFIRME: 'Confirmé', SENIOR: 'Senior'
};

export const REMOTE_LABELS: Record<RemotePolicy, string> = {
  SUR_SITE: 'Sur site', HYBRIDE: 'Hybride', TELETRAVAIL: 'Télétravail complet'
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  TEXTE: 'Réponse libre',
  CHOIX_UNIQUE: 'Choix unique',
  CHOIX_MULTIPLE: 'Choix multiples',
  OUI_NON: 'Oui / Non'
};

export function jobActionLabel(current: JobStatus, target: JobStatus): string {
  switch (target) {
    case 'EN_ATTENTE_VALIDATION': return 'Soumettre à validation';
    case 'PUBLIEE':
      if (current === 'SUSPENDUE') return 'Réactiver';
      if (current === 'CLOTUREE') return 'Rouvrir';
      if (current === 'EN_ATTENTE_VALIDATION') return 'Approuver et publier';
      return 'Publier';
    case 'SUSPENDUE': return 'Suspendre';
    case 'CLOTUREE': return 'Clôturer';
    case 'POURVUE': return 'Marquer comme pourvue';
    case 'ARCHIVEE': return 'Archiver';
    case 'BROUILLON': return 'Renvoyer en brouillon';
  }
}
