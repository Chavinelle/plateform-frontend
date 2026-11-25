import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { RecruitmentStats, StatsQuery } from '../models/stats.models';

/** Indicateurs de recrutement de l'entreprise (un manager : ses offres assignées). */
@Injectable({ providedIn: 'root' })
export class StatsService {
  private http = inject(HttpClient);

  recruitment(q: StatsQuery = {}) {
    return this.http.get<RecruitmentStats>(`${environment.apiUrl}/company/stats`, { params: this.params(q) });
  }

  /** Rapport Excel ou PDF, avec les mêmes filtres que le tableau de bord. */
  export(q: StatsQuery, format: 'XLSX' | 'PDF') {
    return this.http.get(`${environment.apiUrl}/company/stats/export`, {
      params: this.params(q).set('format', format), responseType: 'blob', observe: 'response'
    });
  }

  private params(q: StatsQuery) {
    let params = new HttpParams();
    if (q.from) params = params.set('from', q.from);
    if (q.to) params = params.set('to', q.to);
    if (q.jobId) params = params.set('jobId', q.jobId);
    return params;
  }
}
