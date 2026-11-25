import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import { PersonRef } from '../../../../core/models/company.models';
import {
  CalendarInterview, INTERVIEW_STATUS_LABELS, INTERVIEW_TYPE_LABELS
} from '../../../../core/models/interview.models';
import { AuthService } from '../../../../core/services/auth.service';
import { InterviewCalendarService } from '../../../../core/services/interview-calendar.service';
import { CalendarView, rangeFor } from '../../../../core/utils/calendar';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { AgendaCalendar, AgendaEvent } from '../../../shared/agenda-calendar/agenda-calendar';

/** Valeur du filtre : un membre, ou « toute l'équipe ». */
type MemberFilter = number | 'ALL';

/** Agenda des entretiens de l'entreprise. Un manager ne voit que les siens. */
@Component({
  selector: 'app-company-calendar',
  imports: [AgendaCalendar],
  templateUrl: './company-calendar.html',
  styleUrl: './company-calendar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompanyCalendar {
  private api = inject(InterviewCalendarService);
  private auth = inject(AuthService);

  view = signal<CalendarView>('week');
  anchor = signal(new Date());
  members = signal<PersonRef[]>([]);
  isManager = computed(() => this.auth.user()?.role === 'MANAGER');
  /** Par défaut : mes entretiens. */
  member = signal<MemberFilter>(this.auth.user()?.userId ?? 'ALL');

  interviews = signal<CalendarInterview[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  events = computed<AgendaEvent[]>(() => this.interviews().map(i => ({
    id: i.id,
    start: i.startsAt,
    end: i.endsAt,
    title: i.candidateName,
    subtitle: `${i.jobTitle} · ${INTERVIEW_TYPE_LABELS[i.type]} · avec ${i.participants.map(p => p.name).join(', ')}`,
    cancelled: i.status === 'ANNULE',
    statusLabel: INTERVIEW_STATUS_LABELS[i.status],
    link: ['/recruteur/candidatures', i.applicationId]
  })));

  private query = computed(() => ({ range: rangeFor(this.view(), this.anchor()), member: this.member() }));

  constructor() {
    this.api.members().pipe(catchError(() => of([] as PersonRef[])), takeUntilDestroyed())
      .subscribe(list => this.members.set(list));

    toObservable(this.query).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(q => this.api.company(q.range, q.member === 'ALL' ? null : q.member).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of([] as CalendarInterview[]);
      }))),
      takeUntilDestroyed()
    ).subscribe(list => {
      this.loading.set(false);
      this.interviews.set(list);
    });
  }

  onMemberChange(value: string) {
    this.member.set(value === 'ALL' ? 'ALL' : Number(value));
  }
}
