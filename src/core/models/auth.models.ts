export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInMs: number;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export type Role = 'CANDIDAT' | 'RECRUTEUR' | 'MANAGER' | 'ADMIN_ENTREPRISE' | 'SUPER_ADMIN';

export interface AuthUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface RegisterCandidateRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  /** Acceptation des conditions d'utilisation et de la politique de confidentialité (vérifiée par le serveur). */
  acceptTerms: boolean;
}

export interface RegisterCompanyRequest {
  companyName: string;
  sector?: string;
  size?: string;
  country?: string;
  website?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  /** Acceptation des conditions d'utilisation et de la politique de confidentialité (vérifiée par le serveur). */
  acceptTerms: boolean;
}

export interface MessageResponse {
  message: string;
}
