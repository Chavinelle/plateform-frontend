export type ContractType = 'CDI' | 'CDD' | 'STAGE' | 'ALTERNANCE' | 'FREELANCE';
export type ProfileVisibility = 'PRIVE' | 'ENTREPRISES_POSTULEES' | 'PUBLIC';
export type SkillLevel = 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE' | 'EXPERT';
export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'NATIF';
export type DocumentType = 'CV' | 'LETTRE_MOTIVATION' | 'DIPLOME' | 'ATTESTATION' | 'AUTRE';

export interface CandidateProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  headline: string | null;
  summary: string | null;
  birthDate: string | null;          // format "AAAA-MM-JJ"
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  desiredContractType: ContractType | null;
  desiredLocation: string | null;
  mobile: boolean;
  expectedSalary: number | null;
  visibility: ProfileVisibility;
  hasPhoto: boolean;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  headline: string | null;
  summary: string | null;
  birthDate: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  desiredContractType: ContractType | null;
  desiredLocation: string | null;
  mobile: boolean;
  expectedSalary: number | null;
}

export interface Experience {
  id: number;
  jobTitle: string;
  companyName: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  currentJob: boolean;
  description: string | null;
}
export type ExperienceRequest = Omit<Experience, 'id'>;

export interface Education {
  id: number;
  degree: string;
  institution: string;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
}
export type EducationRequest = Omit<Education, 'id'>;

export interface Skill { id: number; name: string; level: SkillLevel; }
export type SkillRequest = Omit<Skill, 'id'>;

export interface Language { id: number; name: string; level: LanguageLevel; }
export type LanguageRequest = Omit<Language, 'id'>;

export interface DocumentItem {
  id: number;
  docType: DocumentType;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  defaultDocument: boolean;
  uploadedAt: string;
}

export interface CompletionItem {
  key: string;
  label: string;
  points: number;
  done: boolean;
}

export interface CompletionResult {
  percentage: number;
  items: CompletionItem[];
}

// Libellés affichés à l'écran
export const CONTRACT_LABELS: Record<ContractType, string> = {
  CDI: 'CDI', CDD: 'CDD', STAGE: 'Stage', ALTERNANCE: 'Alternance', FREELANCE: 'Freelance'
};
export const SKILL_LABELS: Record<SkillLevel, string> = {
  DEBUTANT: 'Débutant', INTERMEDIAIRE: 'Intermédiaire', AVANCE: 'Avancé', EXPERT: 'Expert'
};
export const LANGUAGE_LEVELS: LanguageLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIF'];
export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  CV: 'CV', LETTRE_MOTIVATION: 'Lettre de motivation', DIPLOME: 'Diplôme',
  ATTESTATION: 'Attestation', AUTRE: 'Autre'
};

export const VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string; description: string }[] = [
  { value: 'PRIVE', label: 'Privé',
    description: 'Seul vous pouvez voir votre profil.' },
  { value: 'ENTREPRISES_POSTULEES', label: 'Entreprises auxquelles je postule',
    description: 'Les recruteurs des entreprises à qui vous envoyez une candidature peuvent consulter votre profil.' },
  { value: 'PUBLIC', label: 'Public',
    description: 'Les recruteurs des entreprises validées peuvent trouver et consulter votre profil.' }
];
