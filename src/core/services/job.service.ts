import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  JobDetail, JobRequest, JobStatus, JobSummary, PageResponse,
  Question, QuestionRequest, Stage, StageRequest
} from '../models/company.models';

@Injectable({ providedIn: 'root' })
export class JobService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/company`;

  search(opts: { status?: JobStatus; q?: string; page: number; size: number }) {
    let params = new HttpParams().set('page', opts.page).set('size', opts.size);
    if (opts.status) params = params.set('status', opts.status);
    if (opts.q) params = params.set('q', opts.q);
    return this.http.get<PageResponse<JobSummary>>(`${this.base}/jobs`, { params });
  }

  get(id: number) {
    return this.http.get<JobDetail>(`${this.base}/jobs/${id}`);
  }
  create(body: JobRequest) {
    return this.http.post<JobDetail>(`${this.base}/jobs`, body);
  }
  update(id: number, body: JobRequest) {
    return this.http.put<JobDetail>(`${this.base}/jobs/${id}`, body);
  }
  changeStatus(id: number, status: JobStatus) {
    return this.http.put<JobDetail>(`${this.base}/jobs/${id}/status`, { status });
  }
  delete(id: number) {
    return this.http.delete<void>(`${this.base}/jobs/${id}`);
  }

  // ---- Questions de présélection ----
  getQuestions(jobId: number) {
    return this.http.get<Question[]>(`${this.base}/jobs/${jobId}/questions`);
  }
  saveQuestions(jobId: number, questions: QuestionRequest[]) {
    return this.http.put<Question[]>(`${this.base}/jobs/${jobId}/questions`, { questions });
  }

  // ---- Pipeline ----
  getJobPipeline(jobId: number) {
    return this.http.get<Stage[]>(`${this.base}/jobs/${jobId}/pipeline`);
  }
  saveJobPipeline(jobId: number, stages: StageRequest[]) {
    return this.http.put<Stage[]>(`${this.base}/jobs/${jobId}/pipeline`, { stages });
  }
  getCompanyPipeline() {
    return this.http.get<Stage[]>(`${this.base}/pipeline`);
  }
  saveCompanyPipeline(stages: StageRequest[]) {
    return this.http.put<Stage[]>(`${this.base}/pipeline`, { stages });
  }
  duplicate(id: number) {
  return this.http.post<JobDetail>(`${this.base}/jobs/${id}/duplicate`, {});
}
}
