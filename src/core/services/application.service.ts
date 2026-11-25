import { HttpClient, HttpParams} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { ApplicationFormData, ApplicationSummary, ApplyRequest,ApplicationStatus, MyApplicationDetail,MyApplicationItem } from '../models/application.models';
import { PageResponse } from '../models/company.models';
import { CandidateInterview, InterviewAnswerRequest } from '../models/interview.models';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/candidate`;

  getForm(jobId: number) {
    return this.http.get<ApplicationFormData>(`${this.base}/jobs/${jobId}/application-form`);
  }

  apply(jobId: number, body: ApplyRequest) {
    return this.http.post<ApplicationSummary>(`${this.base}/jobs/${jobId}/applications`, body);
  }

  list(status: ApplicationStatus | '', page: number, size: number) {
  let params = new HttpParams().set('page', page).set('size', size);
  if (status) params = params.set('status', status);
  return this.http.get<PageResponse<MyApplicationItem>>(`${this.base}/applications`, { params });
}

get(id: number) {
  return this.http.get<MyApplicationDetail>(`${this.base}/applications/${id}`);
}

downloadDocument(applicationId: number, documentId: number) {
  return this.http.get(`${this.base}/applications/${applicationId}/documents/${documentId}/download`, {
    responseType: 'blob'
  });
}

withdraw(id: number) {
  return this.http.post<MyApplicationDetail>(`${this.base}/applications/${id}/withdraw`, {});
}

/** Entretiens de la candidature (6.4). */
interviews(applicationId: number) {
  return this.http.get<CandidateInterview[]>(`${this.base}/applications/${applicationId}/interviews`);
}

/** Accepter, refuser ou proposer un autre créneau. */
respondToInterview(applicationId: number, interviewId: number, body: InterviewAnswerRequest) {
  return this.http.post<CandidateInterview>(
    `${this.base}/applications/${applicationId}/interviews/${interviewId}/response`, body);
}
}
