import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { GradeAnswerRequest, SendTestRequest, TestAttemptDetail, TestAttemptView } from '../models/test.models';

/** Tests envoyés à un candidat, depuis sa fiche candidature. */
@Injectable({ providedIn: 'root' })
export class TestAttemptService {
  private http = inject(HttpClient);

  private base(applicationId: number) {
    return `${environment.apiUrl}/company/applications/${applicationId}/tests`;
  }

  list(applicationId: number) {
    return this.http.get<TestAttemptView[]>(this.base(applicationId));
  }
  /** Envoie le lien unique au candidat par e-mail. */
  send(applicationId: number, body: SendTestRequest) {
    return this.http.post<TestAttemptView>(this.base(applicationId), body);
  }
  /** Annule un envoi pas encore commencé. */
  cancel(applicationId: number, attemptId: number) {
    return this.http.delete<void>(`${this.base(applicationId)}/${attemptId}`);
  }
  /** Réponses du candidat et bonnes réponses, une fois le test remis. */
  detail(applicationId: number, attemptId: number) {
    return this.http.get<TestAttemptDetail>(`${this.base(applicationId)}/${attemptId}`);
  }
  /** Note d'une question ouverte ou d'un exercice de code ; renvoie le passage recalculé. */
  grade(applicationId: number, attemptId: number, answerId: number, body: GradeAnswerRequest) {
    return this.http.put<TestAttemptDetail>(`${this.base(applicationId)}/${attemptId}/answers/${answerId}/grade`, body);
  }
}
