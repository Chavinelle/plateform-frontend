export type CompanyStatus = 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE' | 'SUSPENDUE';
export type UserStatus = 'ACTIF' | 'SUSPENDU' | 'DESACTIVE';

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  EN_ATTENTE: 'En attente',
  VALIDEE: 'Validée',
  REFUSEE: 'Refusée',
  SUSPENDUE: 'Suspendue'
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIF: 'Actif',
  SUSPENDU: 'Suspendu',
  DESACTIVE: 'Fermé'
};

/** Partiel : un rôle inconnu est affiché tel quel. */
export const ROLE_LABELS: Partial<Record<string, string>> = {
  CANDIDAT: 'Candidat',
  RECRUTEUR: 'Recruteur',
  MANAGER: 'Manager',
  ADMIN_ENTREPRISE: 'Administrateur d’entreprise',
  SUPER_ADMIN: 'Super administrateur'
};

/** Décisions possibles depuis chaque statut (mêmes règles que le serveur). */
export const COMPANY_TRANSITIONS: Record<CompanyStatus, CompanyStatus[]> = {
  EN_ATTENTE: ['VALIDEE', 'REFUSEE'],
  VALIDEE: ['SUSPENDUE'],
  SUSPENDUE: ['VALIDEE'],
  REFUSEE: ['VALIDEE']
};

export interface AdminCompanyItem {
  id: number;
  name: string;
  sector: string | null;
  country: string | null;
  city: string | null;
  status: CompanyStatus;
  statusReason: string | null;
  statusChangedAt: string | null;
  createdAt: string;
  adminName: string | null;
  adminEmail: string | null;
  members: number;
  jobs: number;
}

export interface AdminCompanyDetail {
  company: AdminCompanyItem;
  website: string | null;
  size: string | null;
  description: string | null;
  members: { id: number; name: string; email: string; role: string; status: UserStatus; emailVerified: boolean }[];
}

export interface AdminUserItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: UserStatus;
  emailVerified: boolean;
  companyId: number | null;
  companyName: string | null;
  createdAt: string;
  /** Droit à l'effacement exercé (11.8) : compte anonymisé, plus aucune action possible. */
  erasedAt: string | null;
}

// ----- Journal d'audit (10.5) -----

export type AuditAction =
  | 'CONNEXION' | 'CONNEXION_ECHEC' | 'SUPERADMIN_CREE' | 'ENTREPRISE_DECISION' | 'COMPTE_STATUT' | 'MODERATION'
  | 'REFERENTIEL' | 'ROLE_EQUIPE' | 'MEMBRE_DESACTIVE' | 'CANDIDATURE_REJET' | 'EXPORT_CANDIDATURES' | 'EXPORT_RAPPORT'
  | 'COMPTE_EFFACE';

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CONNEXION: 'Connexion',
  CONNEXION_ECHEC: 'Connexion refusée',
  SUPERADMIN_CREE: 'Super administrateur créé',
  ENTREPRISE_DECISION: 'Décision sur une entreprise',
  COMPTE_STATUT: 'Statut d’un compte',
  MODERATION: 'Modération d’une offre',
  REFERENTIEL: 'Référentiel modifié',
  ROLE_EQUIPE: 'Rôle d’un membre',
  MEMBRE_DESACTIVE: 'Membre désactivé',
  CANDIDATURE_REJET: 'Candidature rejetée',
  EXPORT_CANDIDATURES: 'Export de candidatures',
  EXPORT_RAPPORT: 'Export d’un rapport',
  COMPTE_EFFACE: 'Données d’un compte effacées'
};

export interface AuditEntry {
  id: number;
  occurredAt: string;
  actorId: number | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: AuditAction;
  actionLabel: string;
  targetType: string | null;
  targetId: number | null;
  companyId: number | null;
  detail: string | null;
}
