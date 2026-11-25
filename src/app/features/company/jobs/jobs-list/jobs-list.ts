import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { CONTRACT_LABELS } from '../../../../../core/models/candidate.models';
import {
  JOB_STATUS_LABELS, JobStatus, JobSummary, PageResponse
} from '../../../../../core/models/company.models';
import { JobService } from '../../../../../core/services/job.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { NavIcon } from '../../../../layout/nav-icon/nav-icon';

const PAGE_SIZE = 10;
const NEEDS_CONFIRMATION: JobStatus[] = ['SUSPENDUE', 'CLOTUREE', 'POURVUE', 'ARCHIVEE'];

@Component({
  selector: 'app-jobs-list',
  imports: [RouterLink, DatePipe, CdkMenu, CdkMenuItem, CdkMenuTrigger, NavIcon],
  templateUrl: './jobs-list.html',
  styleUrl: './jobs-list.scss'
})
export class JobsList implements OnInit {
  private api = inject(JobService);
  private router = inject(Router);

  result = signal<PageResponse<JobSummary> | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  busyId = signal<number | null>(null);

  status = signal<JobStatus | ''>('');
  q = signal('');
  page = signal(0);

  statuses = (Object.keys(JOB_STATUS_LABELS) as JobStatus[])
    .map(value => ({ value, label: JOB_STATUS_LABELS[value] }));
  totalPages = computed(() => Math.max(this.result()?.totalPages ?? 1, 1));

  private load$ = new Subject<void>();
  private search$ = new Subject<string>();

  constructor() {
    // chaque nouveau chargement annule le précédent encore en cours (pas de résultats dans le désordre)
    this.load$.pipe(
      tap(() => this.loading.set(true)),
      switchMap(() => this.api.search({
        status: this.status() || undefined,
        q: this.q().trim() || undefined,
        page: this.page(),
        size: PAGE_SIZE
      }).pipe(
        catchError(err => {
          this.error.set(extractErrorMessage(err));
          return of(null);
        })
      )),
      takeUntilDestroyed()
    ).subscribe(res => {
      this.loading.set(false);
      if (!res) return;
      if (res.content.length === 0 && res.page > 0) {   // dernière offre de la page supprimée
        this.page.set(res.page - 1);
        this.reload();
        return;
      }
      this.result.set(res);
    });

    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(value => {
        this.q.set(value);
        this.page.set(0);
        this.reload();
      });
  }

  ngOnInit() {
    this.reload();
  }

  onSearch(event: Event) {
    this.search$.next((event.target as HTMLInputElement).value);
  }

  onStatusChange(event: Event) {
    this.status.set((event.target as HTMLSelectElement).value as JobStatus | '');
    this.page.set(0);
    this.reload();
  }

  goTo(page: number) {
    this.page.set(Math.max(page, 0));
    this.reload();
  }

  statusLabel(status: JobStatus): string {
    return JOB_STATUS_LABELS[status];
  }

  contractLabel(j: JobSummary): string {
    return j.contractType ? CONTRACT_LABELS[j.contractType] : '—';
  }

  place(j: JobSummary): string {
    return [j.city, j.country].filter(Boolean).join(', ') || '—';
  }

  /** Les candidatures ne s'ouvrent qu'une fois l'offre soumise (ni brouillon, ni en attente de validation). */
  hasApplications(j: JobSummary): boolean {
    return j.status !== 'BROUILLON' && j.status !== 'EN_ATTENTE_VALIDATION';
  }

  /** Menu « ⋯ » : seulement s'il reste des actions en plus de l'action visible. */
  hasMenu(j: JobSummary): boolean {
    return (this.hasApplications(j) && j.editable)
      || j.allowedTransitions.length > 0
      || (j.status === 'BROUILLON' && j.editable);
  }

  actionLabel(current: JobStatus, target: JobStatus): string {
    switch (target) {
      case 'EN_ATTENTE_VALIDATION': return 'Soumettre à validation';
      case 'PUBLIEE':
        if (current === 'SUSPENDUE') return 'Réactiver';
        if (current === 'CLOTUREE') return 'Rouvrir';
        if (current === 'EN_ATTENTE_VALIDATION') return 'Approuver et publier';
        return 'Publier';
      case 'SUSPENDUE': return 'Suspendre';
      case 'CLOTUREE': return 'Clôturer';
      case 'POURVUE': return 'Marquer comme pourvue';
      case 'ARCHIVEE': return 'Archiver';
      case 'BROUILLON': return 'Renvoyer en brouillon';
    }
  }

  changeStatus(job: JobSummary, target: JobStatus) {
    const label = this.actionLabel(job.status, target);
    if (NEEDS_CONFIRMATION.includes(target) && !confirm(`${label} l'offre « ${job.title} » ?`)) return;

    this.busyId.set(job.id);
    this.message.set(null);
    this.error.set(null);
    this.api.changeStatus(job.id, target).subscribe({
      next: () => {
        this.busyId.set(null);
        this.message.set(`« ${job.title} » : ${JOB_STATUS_LABELS[target].toLowerCase()}.`);
        this.reload();
      },
      error: err => {
        this.busyId.set(null);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  duplicate(job: JobSummary) {
  this.busyId.set(job.id);
  this.message.set(null);
  this.error.set(null);
  this.api.duplicate(job.id).subscribe({
    next: copy => {
      this.busyId.set(null);
      this.router.navigate(['/recruteur/offres', copy.id], { queryParams: { duplicated: 1 } });
    },
    error: err => {
      this.busyId.set(null);
      this.error.set(extractErrorMessage(err));
    }
  });
}

  remove(job: JobSummary) {
    if (!confirm(`Supprimer définitivement le brouillon « ${job.title} » ?`)) return;
    this.busyId.set(job.id);
    this.message.set(null);
    this.error.set(null);
    this.api.delete(job.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.message.set(`Brouillon « ${job.title} » supprimé.`);
        this.reload();
      },
      error: err => {
        this.busyId.set(null);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  private reload() {
    this.load$.next();
  }
}
