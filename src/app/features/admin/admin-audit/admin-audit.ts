import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { AUDIT_ACTION_LABELS, AuditAction, AuditEntry, ROLE_LABELS } from '../../../../core/models/admin.models';
import { PageResponse } from '../../../../core/models/company.models';
import { AdminService } from '../../../../core/services/admin.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';

/** Journal d'audit (lecture seule) : filtres par action, auteur et période. */
@Component({
  selector: 'app-admin-audit',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-audit.html',
  styleUrl: '../admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminAudit {
  private api = inject(AdminService);

  readonly actionLabels = AUDIT_ACTION_LABELS;
  readonly actions = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[];
  readonly roleLabels = ROLE_LABELS;
  action = signal<AuditAction | null>(null);
  actor = signal('');
  from = signal('');
  to = signal('');
  page = signal(0);
  result = signal<PageResponse<AuditEntry> | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor() {
    toObservable(computed(() => ({
      action: this.action(), actor: this.actor().trim(), from: this.from(), to: this.to(), page: this.page()
    }))).pipe(
      debounceTime(250),
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(q => this.api.audit(q).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(r => {
      this.loading.set(false);
      if (r) this.result.set(r);
    });
  }

  setAction(v: string) { this.action.set((v || null) as AuditAction | null); this.page.set(0); }
  setActor(v: string) { this.actor.set(v); this.page.set(0); }
  setFrom(v: string) { this.from.set(v); this.page.set(0); }
  setTo(v: string) { this.to.set(v); this.page.set(0); }

  /** Lien vers la cible quand une page d'administration existe pour elle. */
  targetLink(e: AuditEntry): string[] | null {
    if (e.targetType === 'COMPANY' && e.targetId) return ['/admin/entreprises', String(e.targetId)];
    if (e.companyId && e.targetType !== 'USER') return ['/admin/entreprises', String(e.companyId)];
    return null;
  }
}
