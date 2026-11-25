import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { BulkMessageResponse, MessageThread } from '../models/message.models';

/** Messagerie par candidature ; {@code side} choisit l'espace (entreprise ou candidat). */
@Injectable({ providedIn: 'root' })
export class MessageService {
  private http = inject(HttpClient);

  private url(side: 'company' | 'candidate', applicationId: number) {
    return `${environment.apiUrl}/${side}/applications/${applicationId}/messages`;
  }

  /** Lire le fil marque comme lus les messages de l'autre partie. */
  thread(side: 'company' | 'candidate', applicationId: number) {
    return this.http.get<MessageThread>(this.url(side, applicationId));
  }

  send(side: 'company' | 'candidate', applicationId: number, body: string) {
    return this.http.post<MessageThread>(this.url(side, applicationId), { body });
  }

  /** Même message à plusieurs candidatures de l'offre ({prenom}, {nom}, {poste}, {entreprise} remplacés). */
  bulkSend(jobId: number, applicationIds: number[], body: string) {
    return this.http.post<BulkMessageResponse>(
      `${environment.apiUrl}/company/jobs/${jobId}/applications/bulk-message`, { applicationIds, body });
  }

  bulkPreview(jobId: number, applicationId: number, body: string) {
    return this.http.post<{ candidateName: string; body: string }>(
      `${environment.apiUrl}/company/jobs/${jobId}/applications/bulk-message/preview`, { applicationId, body });
  }
}
