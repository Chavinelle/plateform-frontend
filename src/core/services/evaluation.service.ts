import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { EvaluationSaveRequest, EvaluationView, EvaluationsResponse } from '../models/evaluation.models';

/** Évaluations d'une candidature (7.3 / RG10). */
@Injectable({ providedIn: 'root' })
export class EvaluationService {
  private http = inject(HttpClient);

  private url(applicationId: number) {
    return `${environment.apiUrl}/company/applications/${applicationId}/evaluations`;
  }

  list(applicationId: number) {
    return this.http.get<EvaluationsResponse>(this.url(applicationId));
  }
  /** templateId null : grille par défaut. */
  create(applicationId: number, templateId: number | null, interviewId: number | null) {
    return this.http.post<EvaluationView>(this.url(applicationId), { templateId, interviewId });
  }
  saveDraft(applicationId: number, evaluationId: number, body: EvaluationSaveRequest) {
    return this.http.put<EvaluationView>(`${this.url(applicationId)}/${evaluationId}`, body);
  }
  /** Définitive : toutes les notes et l'avis sont obligatoires. */
  submit(applicationId: number, evaluationId: number, body: EvaluationSaveRequest) {
    return this.http.post<EvaluationView>(`${this.url(applicationId)}/${evaluationId}/submit`, body);
  }
  deleteDraft(applicationId: number, evaluationId: number) {
    return this.http.delete<void>(`${this.url(applicationId)}/${evaluationId}`);
  }
}
