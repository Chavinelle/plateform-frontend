import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { AdminCompanyItem, COMPANY_STATUS_LABELS, CompanyStatus } from '../../../../core/models/admin.models';
import { PageResponse } from '../../../../core/models/company.models';
import { AdminService } from '../../../../core/services/admin.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';

/** Entreprises inscrites : recherche, filtre par statut (les inscriptions en attente d'abord par défaut). */
@Component({
  selector: 'app-admin-companies',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-companies.html',
  styleUrl: '../admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCompanies {
  private api = inject(AdminService);

  readonly statusLabels = COMPANY_STATUS_LABELS;
  readonly statuses = Object.keys(COMPANY_STATUS_LABELS) as CompanyStatus[];
  q = signal('');
  status = signal<CompanyStatus | null>('EN_ATTENTE');
  page = signal(0);
  result = signal<PageResponse<AdminCompanyItem> | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor() {
    toObservable(computed(() => ({ q: this.q().trim(), status: this.status(), page: this.page() }))).pipe(
      debounceTime(250),
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(query => this.api.companies(query).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(r => {
      this.loading.set(false);
      if (r) this.result.set(r);
    });
  }

  setQuery(value: string) {
    this.q.set(value);
    this.page.set(0);
  }

  place(c: AdminCompanyItem): string {
    return [c.sector, c.city, c.country].filter(v => !!v).join(' · ');
  }

  setStatus(value: string) {
    this.status.set((value || null) as CompanyStatus | null);
    this.page.set(0);
  }
}
