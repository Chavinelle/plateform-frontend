import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import {
  CandidateCalendarItem, INTERVIEW_STATUS_LABELS, INTERVIEW_TYPE_LABELS
} from '../../../../core/models/interview.models';
import { InterviewCalendarService } from '../../../../core/services/interview-calendar.service';
import { CalendarView, rangeFor } from '../../../../core/utils/calendar';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { AgendaCalendar, AgendaEvent } from '../../../shared/agenda-calendar/agenda-calendar';

/** Agenda du candidat : ses entretiens, toutes candidatures confondues. */
@Component({
  selector: 'app-my-calendar',
  imports: [AgendaCalendar],
  template: `
    <div class="page page-wide">
      <h1>Mes entretiens</h1>
      <p class="muted">Cliquez sur un entretien pour le confirmer, proposer un autre créneau ou le décliner.</p>
      @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
      <app-agenda-calendar [events]="events()" [loading]="loading()" [(view)]="view" [(anchor)]="anchor" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyCalendar {
  private api = inject(InterviewCalendarService);

  view = signal<CalendarView>('month');
  anchor = signal(new Date());
  items = signal<CandidateCalendarItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  events = computed<AgendaEvent[]>(() => this.items().map(i => ({
    id: i.id,
    start: i.startsAt,
    end: i.endsAt,
    title: i.jobTitle,
    subtitle: `${i.companyName} · ${INTERVIEW_TYPE_LABELS[i.type]}`,
    cancelled: i.status === 'ANNULE',
    statusLabel: INTERVIEW_STATUS_LABELS[i.status],
    link: ['/candidat/candidatures', i.applicationId]
  })));

  private range = computed(() => rangeFor(this.view(), this.anchor()));

  constructor() {
    toObservable(this.range).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(range => this.api.candidate(range).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of([] as CandidateCalendarItem[]);
      }))),
      takeUntilDestroyed()
    ).subscribe(list => {
      this.loading.set(false);
      this.items.set(list);
    });
  }
}
