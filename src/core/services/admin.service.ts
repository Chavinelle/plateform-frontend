import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AdminCompanyDetail, AdminCompanyItem, AdminUserItem, AuditAction, AuditEntry, CompanyStatus, UserStatus } from '../models/admin.models';
import { PageResponse } from '../models/company.models';
import { JobReportGroup, ModerationAction } from '../models/moderation.models';

/** Espace super administrateur : entreprises et comptes. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin`;

  companies(q: { q?: string; status?: CompanyStatus | null; page: number; size?: number }) {
    let params = new HttpParams().set('page', q.page).set('size', q.size ?? 20);
    if (q.q) params = params.set('q', q.q);
    if (q.status) params = params.set('status', q.status);
    return this.http.get<PageResponse<AdminCompanyItem>>(`${this.base}/companies`, { params });
  }
  company(id: number) {
    return this.http.get<AdminCompanyDetail>(`${this.base}/companies/${id}`);
  }
  /** Motif obligatoire pour un refus ou une suspension. */
  decide(id: number, status: CompanyStatus, reason: string | null) {
    return this.http.put<AdminCompanyDetail>(`${this.base}/companies/${id}/status`, { status, reason });
  }

  users(q: { q?: string; role?: string | null; status?: UserStatus | null; page: number; size?: number }) {
    let params = new HttpParams().set('page', q.page).set('size', q.size ?? 20);
    if (q.q) params = params.set('q', q.q);
    if (q.role) params = params.set('role', q.role);
    if (q.status) params = params.set('status', q.status);
    return this.http.get<PageResponse<AdminUserItem>>(`${this.base}/users`, { params });
  }
  /** Signalements regroupés par offre ; {@code open} : seulement ceux à traiter. */
  reports(open = true) {
    return this.http.get<JobReportGroup[]>(`${this.base}/reports`, { params: new HttpParams().set('open', open) });
  }
  /** Classer, retirer (motif obligatoire) ou rétablir une offre. */
  moderate(jobId: number, action: ModerationAction, reason: string | null) {
    return this.http.put<JobReportGroup>(`${this.base}/jobs/${jobId}/moderation`, { action, reason });
  }
  /** Journal d'audit, du plus récent au plus ancien. */
  audit(q: { action?: AuditAction | null; actor?: string; from?: string; to?: string; page: number; size?: number }) {
    let params = new HttpParams().set('page', q.page).set('size', q.size ?? 50);
    if (q.action) params = params.set('action', q.action);
    if (q.actor) params = params.set('actor', q.actor);
    if (q.from) params = params.set('from', q.from);
    if (q.to) params = params.set('to', q.to);
    return this.http.get<PageResponse<AuditEntry>>(`${this.base}/audit`, { params });
  }
  changeUserStatus(id: number, status: UserStatus, reason: string | null) {
    return this.http.put<AdminUserItem>(`${this.base}/users/${id}/status`, { status, reason });
  }

  /** Droit à l'effacement d'un candidat (définitif) ; {@code reason} : référence de la demande. */
  eraseUser(id: number, reason: string) {
    return this.http.post<AdminUserItem>(`${this.base}/users/${id}/erase`, { reason });
  }
}
