import { JobReportReason } from '../models/moderation.models';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { PageResponse } from '../models/company.models';
import {
  JobSearchParams, PublicCompanyProfile, PublicFilters, PublicJobDetail, PublicJobSummary
} from '../models/public.models';

@Injectable({ providedIn: 'root' })
export class PublicService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/public`;

  searchJobs(p: JobSearchParams) {
    let params = new HttpParams();
    const add = (key: string, value: string | number | undefined | null) => {
      if (value !== undefined && value !== null && value !== '') params = params.append(key, String(value));
    };
    add('q', p.q);
    add('city', p.city);
    add('country', p.country);
    add('sector', p.sector);
    p.contractType?.forEach(v => add('contractType', v));
    p.experienceLevel?.forEach(v => add('experienceLevel', v));
    p.remotePolicy?.forEach(v => add('remotePolicy', v));
    add('salaryMin', p.salaryMin);
    add('currency', p.currency);
    add('postedWithinDays', p.postedWithinDays);
    add('companyId', p.companyId);
    add('sort', p.sort);
    add('page', p.page);
    add('size', p.size);
    return this.http.get<PageResponse<PublicJobSummary>>(`${this.base}/jobs`, { params });
  }

  filters() {
    return this.http.get<PublicFilters>(`${this.base}/jobs/filters`);
  }

  /** Signaler une offre (sans compte). */
  reportJob(id: number, body: { reason: JobReportReason; comment: string | null }) {
    return this.http.post<void>(`${this.base}/jobs/${id}/reports`, body);
  }

  getJob(id: number) {
    return this.http.get<PublicJobDetail>(`${this.base}/jobs/${id}`);
  }

  getCompany(id: number) {
    return this.http.get<PublicCompanyProfile>(`${this.base}/companies/${id}`);
  }

  /** Images publiques : une simple balise <img> suffit, aucun jeton n'est nécessaire. */
  companyImageUrl(id: number, slot: 'logo' | 'banner'): string {
    return `${this.base}/companies/${id}/${slot}`;
  }
}
