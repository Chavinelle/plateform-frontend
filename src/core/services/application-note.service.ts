import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { ApplicationNote } from '../models/application.models';
import { PersonRef } from '../models/company.models';

/** Notes internes de l'équipe sur une candidature. */
@Injectable({ providedIn: 'root' })
export class ApplicationNoteService {
  private http = inject(HttpClient);

  private url(applicationId: number) {
    return `${environment.apiUrl}/company/applications/${applicationId}/notes`;
  }

  list(applicationId: number) {
    return this.http.get<ApplicationNote[]>(this.url(applicationId));
  }
  /** Collègues que l'on peut mentionner (@Prénom Nom). */
  mentionable(applicationId: number) {
    return this.http.get<PersonRef[]>(`${this.url(applicationId)}/mentionable`);
  }
  create(applicationId: number, content: string, mentionIds: number[]) {
    return this.http.post<ApplicationNote>(this.url(applicationId), { content, mentionIds });
  }
  update(applicationId: number, noteId: number, content: string, mentionIds: number[]) {
    return this.http.put<ApplicationNote>(`${this.url(applicationId)}/${noteId}`, { content, mentionIds });
  }
  delete(applicationId: number, noteId: number) {
    return this.http.delete<void>(`${this.url(applicationId)}/${noteId}`);
  }
}
