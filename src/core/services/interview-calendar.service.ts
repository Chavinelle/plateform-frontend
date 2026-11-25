import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { PersonRef } from '../models/company.models';
import { CalendarInterview, CandidateCalendarItem } from '../models/interview.models';
import { DateRange, toLocalIso } from '../utils/calendar';

/** Agenda des entretiens (entreprise et candidat). */
@Injectable({ providedIn: 'root' })
export class InterviewCalendarService {
  private http = inject(HttpClient);

  /** memberId absent : toute l'entreprise (un manager ne reçoit que ses propres entretiens). */
  company(range: DateRange, memberId: number | null) {
    let params = rangeParams(range);
    if (memberId !== null) params = params.set('memberId', memberId);
    return this.http.get<CalendarInterview[]>(`${environment.apiUrl}/company/interviews`, { params });
  }

  members() {
    return this.http.get<PersonRef[]>(`${environment.apiUrl}/company/interviews/members`);
  }

  candidate(range: DateRange) {
    return this.http.get<CandidateCalendarItem[]>(`${environment.apiUrl}/candidate/interviews`,
      { params: rangeParams(range) });
  }
}

function rangeParams(range: DateRange): HttpParams {
  return new HttpParams().set('from', toLocalIso(range.from)).set('to', toLocalIso(range.to));
}
