import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { EvaluationTemplate, EvaluationTemplateRequest } from '../models/evaluation.models';

/** Grilles d'évaluation de l'entreprise. */
@Injectable({ providedIn: 'root' })
export class EvaluationTemplateService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/company/evaluation-templates`;

  list(includeArchived = false) {
    return this.http.get<EvaluationTemplate[]>(this.base, { params: new HttpParams().set('includeArchived', includeArchived) });
  }
  create(body: EvaluationTemplateRequest) {
    return this.http.post<EvaluationTemplate>(this.base, body);
  }
  /** Peut créer une nouvelle version (newVersion = true) si la grille est déjà utilisée. */
  update(id: number, body: EvaluationTemplateRequest) {
    return this.http.put<EvaluationTemplate>(`${this.base}/${id}`, body);
  }
  makeDefault(id: number) {
    return this.http.post<EvaluationTemplate>(`${this.base}/${id}/default`, {});
  }
  restore(id: number) {
    return this.http.post<EvaluationTemplate>(`${this.base}/${id}/restore`, {});
  }
  /** Supprime une grille jamais utilisée, archive une grille utilisée. */
  remove(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
