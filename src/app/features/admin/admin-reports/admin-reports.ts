import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import {
  JobReportGroup, ModerationAction, REPORT_REASON_LABELS, REPORT_STATUS_LABELS
} from '../../../../core/models/moderation.models';
import { AdminService } from '../../../../core/services/admin.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';

/** Signalements regroupés par offre : classer sans suite, retirer l'offre, ou lever un retrait. */
@Component({
  selector: 'app-admin-reports',
  imports: [DatePipe],
  templateUrl: './admin-reports.html',
  styleUrl: '../admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminReports {
  private api = inject(AdminService);

  readonly reasonLabels = REPORT_REASON_LABELS;
  readonly statusLabels = REPORT_STATUS_LABELS;
  open = signal(true);
  groups = signal<JobReportGroup[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  message = signal<string | null>(null);

  pending = signal<{ jobId: number; action: ModerationAction } | null>(null);
  reason = signal('');
  busy = signal(false);
  private tick = signal(0);

  constructor() {
    toObservable(computed(() => ({ open: this.open(), t: this.tick() }))).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(q => this.api.reports(q.open).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(list => {
      this.loading.set(false);
      if (list) this.groups.set(list);
    });
  }

  ask(jobId: number, action: ModerationAction) {
    this.pending.set({ jobId, action });
    this.reason.set('');
    this.error.set(null);
    this.message.set(null);
  }

  confirm() {
    const p = this.pending();
    if (!p) return;
    if (p.action === 'RETIRER' && !this.reason().trim()) {
      this.error.set('Indiquez le motif du retrait : il sera communiqué à l’entreprise.');
      return;
    }
    this.busy.set(true);
    this.api.moderate(p.jobId, p.action, this.reason().trim() || null).subscribe({
      next: g => {
        this.busy.set(false);
        this.pending.set(null);
        this.message.set(p.action === 'CLASSER' ? `Signalements de « ${g.jobTitle} » classés sans suite.`
          : p.action === 'RETIRER' ? `« ${g.jobTitle} » est retirée ; l’entreprise est prévenue.`
          : `Le retrait de « ${g.jobTitle} » est levé.`);
        this.tick.update(n => n + 1);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
