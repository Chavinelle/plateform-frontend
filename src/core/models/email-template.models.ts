export type EmailTemplateType =
  | 'CANDIDATURE_RECUE' | 'REJET' | 'ENTRETIEN_INVITATION' | 'ENTRETIEN_REPORT' | 'ENTRETIEN_ANNULATION' | 'TEST_ENVOI';

export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
}

export interface EmailTemplateView {
  type: EmailTemplateType;
  label: string;
  description: string;
  variables: TemplateVariable[];
  /** Variables obligatoires dans le texte (sans accolades). */
  required: string[];
  subject: string;
  body: string;
  /** false : le texte par défaut s'applique. */
  customized: boolean;
  defaultSubject: string;
  defaultBody: string;
  updatedAt: string | null;
  updatedByName: string | null;
}

export interface EmailTemplateRequest {
  subject: string;
  body: string;
}

export interface EmailPreview {
  subject: string;
  body: string;
}
