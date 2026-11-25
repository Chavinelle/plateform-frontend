import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, fromEvent, of, switchMap, tap } from 'rxjs';
import {
  APPLICATION_STATUS_LABELS, ApplicationStatus, MyApplicationItem
} from '../../../../core/models/application.models';
import { PageResponse } from '../../../../core/models/company.models';
import { ApplicationService } from '../../../../core/services/application.service';
import { PublicService } from '../../../../core/services/public.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-my-applications',
  imports: [RouterLink, DatePipe],
  templateUrl: './my-applications.html',
  styleUrl: './my-applications.scss'
})
export class MyApplications implements OnInit {
  private api = inject(ApplicationService);
  private publicApi = inject(PublicService);

  busyId = signal<number | null>(null);
  result = signal<PageResponse<MyApplicationItem> | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  status = signal<ApplicationStatus | ''>('');
  page = signal(0);
  totalPages = computed(() => Math.max(this.result()?.totalPages ?? 1, 1));

  statuses = (Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[])
    .map(value => ({ value, label: APPLICATION_STATUS_LABELS[value] }));

  private load$ = new Subject<void>();

  constructor() {
    this.load$.pipe(
      tap(() => { this.loading.set(true); this.error.set(null); }),
      switchMap(() => this.api.list(this.status(), this.page(), PAGE_SIZE).pipe(
        catchError(err => {
          this.error.set(extractErrorMessage(err));
          return of(null);
        })
      )),
      takeUntilDestroyed()
    ).subscribe(res => {
      this.loading.set(false);
      if (res) this.result.set(res);
    });

    // le statut peut avoir changé pendant que l'onglet était en arrière-plan : on actualise au retour
    fromEvent(document, 'visibilitychange').pipe(takeUntilDestroyed()).subscribe(() => {
      if (document.visibilityState === 'visible') this.reload();
    });
  }

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.load$.next();
  }

  onStatus(event: Event) {
    this.status.set((event.target as HTMLSelectElement).value as ApplicationStatus | '');
    this.page.set(0);
    this.reload();
  }

  goTo(page: number) {
    this.page.set(Math.max(page, 0));
    this.reload();
  }

  statusLabel(status: ApplicationStatus): string {
    return APPLICATION_STATUS_LABELS[status];
  }

  logoUrl(a: MyApplicationItem): string {
    return this.publicApi.companyImageUrl(a.companyId, 'logo');
  }

  initials(a: MyApplicationItem): string {
    return a.companyName.trim().slice(0, 2).toUpperCase();
  }

  place(a: MyApplicationItem): string {
    const place = [a.city, a.country].filter(Boolean).join(', ');
    return place ? ` · ${place}` : '';
  }


withdraw(a: MyApplicationItem) {
  const message = `Retirer votre candidature pour « ${a.jobTitle} » ?\n\n`
    + 'Vous ne pourrez plus postuler à cette offre.';
  if (!confirm(message)) return;

  this.busyId.set(a.id);
  this.error.set(null);
  this.api.withdraw(a.id).subscribe({
    next: () => {
      this.busyId.set(null);
      this.reload();
    },
    error: err => {
      this.busyId.set(null);
      this.error.set(extractErrorMessage(err));
    }
  });
}
}
