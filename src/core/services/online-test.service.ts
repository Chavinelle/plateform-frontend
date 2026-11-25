import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { OnlineTest, OnlineTestRequest } from '../models/test.models';

/** Tests en ligne de l'entreprise. */
@Injectable({ providedIn: 'root' })
export class OnlineTestService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/company/tests`;

  list(includeArchived = false) {
    return this.http.get<OnlineTest[]>(this.base, { params: new HttpParams().set('includeArchived', includeArchived) });
  }
  create(body: OnlineTestRequest) {
    return this.http.post<OnlineTest>(this.base, body);
  }
  /** Refusé si le test a déjà été envoyé à un candidat. */
  update(id: number, body: OnlineTestRequest) {
    return this.http.put<OnlineTest>(`${this.base}/${id}`, body);
  }
  duplicate(id: number) {
    return this.http.post<OnlineTest>(`${this.base}/${id}/duplicate`, {});
  }
  restore(id: number) {
    return this.http.post<OnlineTest>(`${this.base}/${id}/restore`, {});
  }
  /** Supprime un test jamais envoyé, archive les autres. */
  remove(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
