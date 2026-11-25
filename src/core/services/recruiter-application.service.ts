import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  BulkMoveRequest, BulkMoveResponse, CandidateMessage, ExportFormat, JobBoard, ManualApplicationRequest,
  ManualApplicationResponse, MoveStageRequest,
  RecruiterApplicationDetail, RecruiterApplicationFilters, RecruiterApplicationItem, RecruiterApplicationQuery
} from '../models/application.models';
import { PageResponse } from '../models/company.models';
import { ApplicationComparison } from '../models/comparison.models';

/** Candidatures reçues par l'entreprise (espace recruteur). */
@Injectable({ providedIn: 'root' })
export class RecruiterApplicationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/company`;

  listForJob(jobId: number, query: RecruiterApplicationQuery) {
    const params = filterParams(query).set('page', query.page).set('size', query.size);
    return this.http.get<PageResponse<RecruiterApplicationItem>>(`${this.base}/jobs/${jobId}/applications`, { params });
  }

  /** Comparaison côte à côte de 2 à 4 candidatures de l'offre (RG10 appliquée par le serveur). */
  compare(jobId: number, ids: number[]) {
    return this.http.get<ApplicationComparison>(`${this.base}/jobs/${jobId}/applications/compare`,
      { params: new HttpParams().set('ids', ids.join(',')) });
  }

  /** Ajout manuel d'un candidat ; le CV (PDF ou DOCX) est facultatif. */
  addManual(jobId: number, data: ManualApplicationRequest, cv: File | null) {
    const body = new FormData();
    body.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    if (cv) body.append('cv', cv);
    return this.http.post<ManualApplicationResponse>(`${this.base}/jobs/${jobId}/applications`, body);
  }

  /** Fichier CSV ou Excel des candidatures correspondant aux filtres. */
  export(jobId: number, filters: RecruiterApplicationFilters, format: ExportFormat) {
    return this.http.get(`${this.base}/jobs/${jobId}/applications/export`, {
      params: filterParams(filters).set('format', format),
      responseType: 'blob',
      observe: 'response'
    });
  }

  board(jobId: number) {
    return this.http.get<JobBoard>(`${this.base}/jobs/${jobId}/board`);
  }

  get(id: number) {
    return this.http.get<RecruiterApplicationDetail>(`${this.base}/applications/${id}`);
  }

  moveToStage(id: number, body: MoveStageRequest) {
    return this.http.put<RecruiterApplicationDetail>(`${this.base}/applications/${id}/stage`, body);
  }

  /** Déplace (ou rejette) plusieurs candidatures d'une offre en une fois. */
  bulkMove(jobId: number, body: BulkMoveRequest) {
    return this.http.post<BulkMoveResponse>(`${this.base}/jobs/${jobId}/applications/bulk-move`, body);
  }

  /** Modèle de message pour un rejet groupé ({prénom} et {nom} remplacés pour chacun). */
  rejectionTemplate(jobId: number) {
    return this.http.get<CandidateMessage>(`${this.base}/jobs/${jobId}/rejection-message`);
  }

  /** Message de rejet par défaut (modifiable avant l'envoi). */
  rejectionMessage(id: number) {
    return this.http.get<CandidateMessage>(`${this.base}/applications/${id}/rejection-message`);
  }

  rate(id: number, rating: number | null) {
    return this.http.put<RecruiterApplicationDetail>(`${this.base}/applications/${id}/rating`, { rating });
  }

  setTags(id: number, tags: string[]) {
    return this.http.put<RecruiterApplicationDetail>(`${this.base}/applications/${id}/tags`, { tags });
  }

  /** Étiquettes déjà utilisées dans l'entreprise. */
  tagSuggestions() {
    return this.http.get<string[]>(`${this.base}/application-tags`);
  }

  /** inline = true : pour l'aperçu intégré (le jeton est envoyé, contrairement à un simple lien). */
  downloadDocument(applicationId: number, documentId: number, inline = false) {
    return this.http.get(`${this.base}/applications/${applicationId}/documents/${documentId}/download`, {
      params: new HttpParams().set('inline', inline),
      responseType: 'blob'
    });
  }
}

function filterParams(f: RecruiterApplicationFilters): HttpParams {
  let params = new HttpParams().set('sort', f.sort);
  if (f.q) params = params.set('q', f.q);
  if (f.status) params = params.set('status', f.status);
  if (f.stageId !== undefined) params = params.set('stageId', f.stageId);
  if (f.knockout !== undefined) params = params.set('knockout', f.knockout);
  if (f.minRating !== undefined) params = params.set('minRating', f.minRating);
  if (f.tag) params = params.set('tag', f.tag);
  return params;
}
