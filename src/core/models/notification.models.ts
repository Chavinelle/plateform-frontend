export type NotificationType =
  | 'CANDIDATURE_RECUE' | 'CANDIDATURE_RETIREE' | 'ENTRETIEN_PLANIFIE' | 'ENTRETIEN_REPONSE' | 'TEST_REMIS'
  | 'EVALUATION_SOUMISE' | 'MENTION' | 'CANDIDATURE_ETAPE' | 'ENTRETIEN_INVITATION' | 'ENTRETIEN_MODIFIE'
  | 'ENTRETIEN_ANNULE' | 'TEST_RECU' | 'MESSAGE_RECU' | 'VIVIER';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  /** Chemin dans l'application (ex. /candidat/candidatures/12), ou null. */
  link: string | null;
  read: boolean;
  createdAt: string;
}

/** FACULTATIF : case modifiable ; TOUJOURS : e-mail indispensable (verrouillé) ; AUCUN : pas d'e-mail. */
export type EmailMode = 'FACULTATIF' | 'TOUJOURS' | 'AUCUN';

export interface NotificationPreference {
  type: NotificationType;
  label: string;
  inApp: boolean;
  email: boolean;
  emailMode: EmailMode;
}

/** Intervalle de mise à jour du compteur de la cloche (en attendant le temps réel, 8.7). */
export const NOTIFICATION_POLL_MS = 60_000;
