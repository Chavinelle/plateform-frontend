import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { PublicTestView, TestAnswerInput } from '../models/test.models';

/** Passage d'un test par le candidat, avec le jeton de son lien (sans connexion). */
@Injectable({ providedIn: 'root' })
export class PublicTestService {
  private http = inject(HttpClient);

  private base(token: string) {
    return `${environment.apiUrl}/public/tests/${encodeURIComponent(token)}`;
  }

  view(token: string) {
    return this.http.get<PublicTestView>(this.base(token));
  }
  /** Démarre le minuteur. */
  start(token: string) {
    return this.http.post<PublicTestView>(`${this.base(token)}/start`, {});
  }
  /** Sauvegarde automatique d'une réponse. */
  saveAnswer(token: string, answer: TestAnswerInput) {
    return this.http.put<void>(`${this.base(token)}/answers`, answer);
  }
  /** Remise avec les dernières réponses. */
  submit(token: string, answers: TestAnswerInput[]) {
    return this.http.post<PublicTestView>(`${this.base(token)}/submit`, { answers });
  }
}
