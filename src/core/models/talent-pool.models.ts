/** Candidat du vivier vu par l'entreprise ; la note est interne et jamais montrée au candidat. */
export interface TalentPoolItem {
  entryId: number;
  candidateId: number;
  candidateName: string;
  headline: string | null;
  city: string | null;
  skills: string[];
  tags: string[];
  note: string | null;
  addedAt: string;
  expiresAt: string;
  addedByName: string | null;
  lists: { id: number; name: string }[];
  /** Ajout : false si le candidat était déjà dans le vivier. */
  created: boolean;
}

export interface TalentList {
  id: number;
  name: string;
  size: number;
}

/** Vivier vu par le candidat. */
export interface CandidatePool {
  entryId: number;
  companyName: string;
  addedAt: string;
  expiresAt: string;
}

export interface TalentPoolQuery {
  q?: string;
  skill?: string;
  city?: string;
  tag?: string;
  listId?: number | null;
  page: number;
}
