import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { TestQuestion, TestQuestionRequest, TestQuestionType } from '../models/test.models';

/** Banque de questions de l'entreprise. */
@Injectable({ providedIn: 'root' })
export class TestQuestionService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/company/test-questions`;

  list(filters: { includeArchived?: boolean; category?: string | null; type?: TestQuestionType | null } = {}) {
    let params = new HttpParams().set('includeArchived', filters.includeArchived ?? false);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.type) params = params.set('type', filters.type);
    return this.http.get<TestQuestion[]>(this.base, { params });
  }
  categories() {
    return this.http.get<string[]>(`${this.base}/categories`);
  }
  create(body: TestQuestionRequest) {
    return this.http.post<TestQuestion>(this.base, body);
  }
  /** Refusé si la question fait partie d'un test déjà envoyé. */
  update(id: number, body: TestQuestionRequest) {
    return this.http.put<TestQuestion>(`${this.base}/${id}`, body);
  }
  duplicate(id: number) {
    return this.http.post<TestQuestion>(`${this.base}/${id}/duplicate`, {});
  }
  restore(id: number) {
    return this.http.post<TestQuestion>(`${this.base}/${id}/restore`, {});
  }
  /** Supprime une question présente dans aucun test, archive les autres. */
  remove(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
