export type MessageSide = 'CANDIDAT' | 'ENTREPRISE';

export interface ThreadMessage {
  id: number;
  side: MessageSide;
  /** Côté entreprise : le membre (vu par l'équipe) ou le nom de l'entreprise (vu par le candidat). */
  authorName: string;
  body: string;
  mine: boolean;
  /** Lu par l'autre partie. */
  read: boolean;
  createdAt: string;
}

export interface MessageThread {
  messages: ThreadMessage[];
  canWrite: boolean;
  /** Pourquoi on ne peut plus écrire, sinon null. */
  closedReason: string | null;
}

export const MAX_MESSAGE_LENGTH = 5000;

/** Compte rendu d'un envoi groupé. */
export interface BulkMessageResponse {
  sent: number;
  failures: { applicationId: number; candidateName: string | null; reason: string }[];
}
