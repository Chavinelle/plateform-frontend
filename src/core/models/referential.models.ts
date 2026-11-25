export type ReferentialKind = 'SECTEUR' | 'COMPETENCE' | 'VILLE';

export const REFERENTIAL_LABELS: Record<ReferentialKind, string> = {
  SECTEUR: 'Secteurs',
  COMPETENCE: 'Compétences',
  VILLE: 'Villes'
};

export interface ReferentialView {
  items: { id: number; label: string; archived: boolean; usage: number }[];
  /** Valeurs saisies librement les plus fréquentes, absentes du référentiel. */
  freeValues: { value: string; count: number; variants: number }[];
}
