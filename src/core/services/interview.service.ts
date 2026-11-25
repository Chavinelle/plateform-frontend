import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { PersonRef } from '../models/company.models';
import {
  InterviewCancelRequest, InterviewReportRequest, InterviewReportsResponse, InterviewRequest,
  InterviewRescheduleRequest, InterviewStatus, InterviewView
} from '../models/interview.models';

/** Entretiens d'une candidature (espace recruteur). */
@Injectable({ providedIn: 'root' })
export class InterviewService {
  private http = inject(HttpClient);

  private url(applicationId: number) {
    return `${environment.apiUrl}/company/applications/${applicationId}/interviews`;
  }

  list(applicationId: number) {
    return this.http.get<InterviewView[]>(this.url(applicationId));
  }
  /** Membres que l'on peut ajouter comme participants. */
  participants(applicationId: number) {
    return this.http.get<PersonRef[]>(`${this.url(applicationId)}/participants`);
  }
  /** Répond 409 si un participant a déjà un entretien sur ce créneau (RG9). */
  create(applicationId: number, body: InterviewRequest) {
    return this.http.post<InterviewView>(this.url(applicationId), body);
  }
  /** Report : 409 si l'entretien a changé entre-temps ou en cas de conflit d'horaire. */
  reschedule(applicationId: number, interviewId: number, body: InterviewRescheduleRequest) {
    return this.http.put<InterviewView>(`${this.url(applicationId)}/${interviewId}/schedule`, body);
  }
  cancel(applicationId: number, interviewId: number, body: InterviewCancelRequest) {
    return this.http.post<InterviewView>(`${this.url(applicationId)}/${interviewId}/cancel`, body);
  }
  /** Entretien passé : réalisé ou absent. */
  setOutcome(applicationId: number, interviewId: number, version: number, outcome: Extract<InterviewStatus, 'REALISE' | 'ABSENT'>) {
    return this.http.post<InterviewView>(`${this.url(applicationId)}/${interviewId}/outcome`, { version, outcome });
  }
  /** Comptes rendus visibles (RG10). */
  reports(applicationId: number, interviewId: number) {
    return this.http.get<InterviewReportsResponse>(`${this.url(applicationId)}/${interviewId}/reports`);
  }
  saveMyReport(applicationId: number, interviewId: number, body: InterviewReportRequest) {
    return this.http.put<InterviewReportsResponse>(`${this.url(applicationId)}/${interviewId}/reports/mine`, body);
  }
}
