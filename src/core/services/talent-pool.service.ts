import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { PageResponse } from '../models/company.models';
import { CandidatePool, TalentList, TalentPoolItem, TalentPoolQuery } from '../models/talent-pool.models';

/** Vivier de talents : entreprise (recherche, listes, proposition) et candidat (consultation, retrait). */
@Injectable({ providedIn: 'root' })
export class TalentPoolService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/company/talent-pool`;
  private lists_ = `${environment.apiUrl}/company/talent-lists`;

  search(q: TalentPoolQuery) {
    let params = new HttpParams().set('page', q.page).set('size', 20);
    for (const k of ['q', 'skill', 'city', 'tag'] as const) {
      const v = q[k]?.trim();
      if (v) params = params.set(k, v);
    }
    if (q.listId) params = params.set('listId', q.listId);
    return this.http.get<PageResponse<TalentPoolItem>>(this.base, { params });
  }
  /** Ajout depuis une candidature ; {@code created=false} si le candidat y était déjà. */
  add(applicationId: number, note: string | null, tags: string[]) {
    return this.http.post<TalentPoolItem>(this.base, { applicationId, note, tags });
  }
  tags() {
    return this.http.get<string[]>(`${this.base}/tags`);
  }
  update(entryId: number, note: string | null, tags: string[]) {
    return this.http.put<TalentPoolItem>(`${this.base}/${entryId}`, { note, tags });
  }
  remove(entryId: number) {
    return this.http.delete<void>(`${this.base}/${entryId}`);
  }
  propose(entryId: number, jobId: number) {
    return this.http.post<{ applicationId: number }>(`${this.base}/${entryId}/propose`, { jobId });
  }

  lists() {
    return this.http.get<TalentList[]>(this.lists_);
  }
  createList(name: string) {
    return this.http.post<TalentList[]>(this.lists_, { name });
  }
  deleteList(id: number) {
    return this.http.delete<TalentList[]>(`${this.lists_}/${id}`);
  }
  setMembership(listId: number, entryId: number, member: boolean) {
    const url = `${this.lists_}/${listId}/members/${entryId}`;
    return member ? this.http.put<TalentPoolItem>(url, {}) : this.http.delete<TalentPoolItem>(url);
  }

  // ---- candidat ----
  myPools() {
    return this.http.get<CandidatePool[]>(`${environment.apiUrl}/candidate/talent-pools`);
  }
  leave(entryId: number) {
    return this.http.delete<void>(`${environment.apiUrl}/candidate/talent-pools/${entryId}`);
  }
}
