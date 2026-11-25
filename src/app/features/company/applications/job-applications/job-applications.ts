import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender,
  computed, inject, signal, viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, forkJoin, of, switchMap, tap } from 'rxjs';
import {
  APPLICATION_SOURCE_LABELS, APPLICATION_STATUS_LABELS, ApplicationStatus, BulkMoveResponse, ExportFormat,
  RecruiterApplicationFilters,
  RECRUITER_SORT_LABELS, RecruiterApplicationItem, RecruiterApplicationSort
} from '../../../../../core/models/application.models';
import { JobDetail, PageResponse, Stage } from '../../../../../core/models/company.models';
import { AuthService } from '../../../../../core/services/auth.service';
import { JobService } from '../../../../../core/services/job.service';
import { RecruiterApplicationService } from '../../../../../core/services/recruiter-application.service';
import { filenameFrom, readBlobError, saveBlob } from '../../../../../core/utils/download';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { BulkActions } from '../bulk-actions/bulk-actions';
import { BulkMessageResponse } from '../../../../../core/models/message.models';
import { DocumentPreview } from '../document-preview/document-preview';
import { StarRating } from '../star-rating/star-rating';
import { NavIcon } from '../../../../layout/nav-icon/nav-icon';

const PAGE_SIZE = 20;

type KnockoutFilter = '' | 'true' | 'false';

@Component({
  selector: 'app-job-applications',
  imports: [RouterLink, DatePipe, DecimalPipe, DocumentPreview, StarRating, BulkActions, CdkMenu, CdkMenuItem, CdkMenuTrigger, NavIcon],
  templateUrl: './job-applications.html',
  styleUrl: './job-applications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobApplications {
  private route = inject(ActivatedRoute);
  private jobApi = inject(JobService);
  private api = inject(RecruiterApplicationService);
  private injector = inject(Injector);
  private auth = inject(AuthService);

  jobId = signal<number | null>(null);
  job = signal<JobDetail | null>(null);
  stages = signal<Stage[]>([]);
  notFound = signal(false);

  result = signal<PageResponse<RecruiterApplicationItem> | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  q = signal('');
  status = signal<ApplicationStatus | ''>('');
  stageId = signal<number | null>(null);
  knockout = signal<KnockoutFilter>('');
  minRating = signal<number | null>(null);
  tag = signal('');
  tagOptions = signal<string[]>([]);
  sort = signal<RecruiterApplicationSort>('RECENT');
  page = signal(0);

  // ---- sélection pour les actions en masse (page affichée uniquement) ----
  checkedIds = signal<ReadonlySet<number>>(new Set());
  bulkMessage = signal<string | null>(null);
  bulkFailures = signal<BulkMoveResponse['failures']>([]);
  /** Un manager consulte seulement (le serveur le vérifie aussi). */
  canManage = computed(() => this.auth.user()?.role !== 'MANAGER');
  /** Ajout manuel : offre publiée, suspendue ou clôturée (règle vérifiée aussi par le serveur). */
  canAddCandidate = computed(() => {
    const status = this.job()?.status;
    return this.canManage() && (status === 'PUBLIEE' || status === 'SUSPENDUE' || status === 'CLOTUREE');
  });
  selectable = computed(() => (this.result()?.content ?? []).filter(a => a.status !== 'RETIREE'));
  checkedItems = computed(() => this.selectable().filter(a => this.checkedIds().has(a.id)));
  allChecked = computed(() => this.selectable().length > 0 && this.checkedItems().length === this.selectable().length);
  someChecked = computed(() => this.checkedItems().length > 0 && !this.allChecked());
  /** Comparaison côte à côte : de 2 à 4 candidats cochés. */
  canCompare = computed(() => this.checkedItems().length >= 2 && this.checkedItems().length <= 4);
  compareIds = computed(() => this.checkedItems().map(a => a.id).join(','));
  readonly hiddenHint = 'soumettez d’abord votre évaluation de ce candidat (évaluation indépendante)';

  exporting = signal<ExportFormat | null>(null);

  // ---- aperçu du CV ----
  selected = signal<RecruiterApplicationItem | null>(null);
  private previewHeading = viewChild<ElementRef<HTMLElement>>('previewHeading');

  statuses = (Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[])
    .map(value => ({ value, label: APPLICATION_STATUS_LABELS[value] }));
  sorts = (Object.keys(RECRUITER_SORT_LABELS) as RecruiterApplicationSort[])
    .map(value => ({ value, label: RECRUITER_SORT_LABELS[value] }));
  totalPages = computed(() => Math.max(this.result()?.totalPages ?? 1, 1));
  hasFilters = computed(() =>
    this.q().trim() !== '' || this.status() !== '' || this.stageId() !== null || this.knockout() !== ''
    || this.minRating() !== null || this.tag() !== '');

  private load$ = new Subject<void>();
  private search$ = new Subject<string>();

  constructor() {
    // ---- offre + étapes du pipeline (pour le filtre) ----
    this.route.paramMap.pipe(
      tap(() => {
        this.job.set(null);
        this.result.set(null);
        this.notFound.set(false);
        this.closePreview();
      }),
      switchMap(pm => {
        const id = Number(pm.get('id'));
        if (!Number.isInteger(id)) return of(null);
        this.jobId.set(id);
        return forkJoin({
          job: this.jobApi.get(id),
          stages: this.jobApi.getJobPipeline(id),
          tags: this.api.tagSuggestions().pipe(catchError(() => of([] as string[])))
        })
          .pipe(catchError(() => of(null)));
      }),
      takeUntilDestroyed()
    ).subscribe(res => {
      if (!res) {
        this.notFound.set(true);
        return;
      }
      this.job.set(res.job);
      this.stages.set(res.stages);
      this.tagOptions.set(res.tags);
      this.reload();
    });

    // ---- liste : chaque chargement annule le précédent ----
    this.load$.pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
        this.checkedIds.set(new Set());        // la sélection ne survit pas à un changement de page ou de filtre
      }),
      switchMap(() => {
        const jobId = this.jobId();
        if (jobId === null) return of(null);
        return this.api.listForJob(jobId, { ...this.filters(), page: this.page(), size: PAGE_SIZE }).pipe(catchError(err => {
          this.error.set(extractErrorMessage(err));
          return of(null);
        }));
      }),
      takeUntilDestroyed()
    ).subscribe(res => {
      this.loading.set(false);
      if (res) this.result.set(res);
    });

    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(value => {
        this.q.set(value);
        this.page.set(0);
        this.reload();
      });

  }

  // =================== Filtres ===================

  onSearch(event: Event) {
    this.search$.next((event.target as HTMLInputElement).value);
  }

  onStatus(event: Event) {
    this.status.set((event.target as HTMLSelectElement).value as ApplicationStatus | '');
    this.resetPageAndReload();
  }

  onStage(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.stageId.set(value === '' ? null : Number(value));
    this.resetPageAndReload();
  }

  onKnockout(event: Event) {
    this.knockout.set((event.target as HTMLSelectElement).value as KnockoutFilter);
    this.resetPageAndReload();
  }

  onMinRating(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.minRating.set(value === '' ? null : Number(value));
    this.resetPageAndReload();
  }

  onTag(event: Event) {
    this.tag.set((event.target as HTMLSelectElement).value);
    this.resetPageAndReload();
  }

  onSort(event: Event) {
    this.sort.set((event.target as HTMLSelectElement).value as RecruiterApplicationSort);
    this.resetPageAndReload();
  }

  goTo(page: number) {
    this.page.set(Math.max(page, 0));
    this.reload();
  }

  reload() {
    this.load$.next();
  }

  // =================== Export ===================

  /** Exporte toutes les candidatures correspondant aux filtres actuels (pas seulement la page affichée). */
  exportAs(format: ExportFormat) {
    const job = this.job();
    if (!job) return;
    this.exporting.set(format);
    this.error.set(null);
    this.api.export(job.id, this.filters(), format).subscribe({
      next: res => {
        this.exporting.set(null);
        const fallback = `candidatures-${job.id}.${format === 'XLSX' ? 'xlsx' : 'csv'}`;
        if (res.body) saveBlob(res.body, filenameFrom(res, fallback));
      },
      error: err => {
        this.exporting.set(null);
        readBlobError(err).then(message => this.error.set(message));
      }
    });
  }

  // =================== Sélection et actions en masse ===================

  toggle(a: RecruiterApplicationItem, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.checkedIds.update(ids => {
      const next = new Set(ids);
      if (checked) next.add(a.id); else next.delete(a.id);
      return next;
    });
  }

  toggleAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.checkedIds.set(checked ? new Set(this.selectable().map(a => a.id)) : new Set());
  }

  clearSelection() {
    this.checkedIds.set(new Set());
  }

  onBulkDone(res: BulkMoveResponse) {
    this.bulkMessage.set(`${res.moved} candidature(s) mise(s) à jour.`
      + (res.failures.length ? ` ${res.failures.length} non traitée(s).` : ''));
    this.bulkFailures.set(res.failures);
    this.reload();
  }

  onBulkMessaged(res: BulkMessageResponse) {
    this.bulkMessage.set(`${res.sent} message(s) envoyé(s).`
      + (res.failures.length ? ` ${res.failures.length} candidat(s) ignoré(s).` : ''));
    this.bulkFailures.set(res.failures);
    this.clearSelection();
  }

  // =================== Aperçu ===================

  preview(item: RecruiterApplicationItem) {
    if (this.selected()?.id === item.id) {
      this.closePreview();
      return;
    }
    this.selected.set(item);
    // on amène le focus sur le panneau pour les utilisateurs du clavier et des lecteurs d'écran
    afterNextRender(() => this.previewHeading()?.nativeElement.focus(), { injector: this.injector });
  }

  closePreview() {
    this.selected.set(null);
  }

  // =================== Affichage ===================

  statusLabel(status: ApplicationStatus): string {
    return APPLICATION_STATUS_LABELS[status];
  }

  sourceLabel(a: RecruiterApplicationItem): string {
    return APPLICATION_SOURCE_LABELS[a.source];
  }

  place(a: RecruiterApplicationItem): string {
    return [a.city, a.country].filter(Boolean).join(', ');
  }

  // =================== Outils ===================

  private filters(): RecruiterApplicationFilters {
    const knockout = this.knockout();
    return {
      q: this.q().trim() || undefined,
      status: this.status() || undefined,
      stageId: this.stageId() ?? undefined,
      knockout: knockout === '' ? undefined : knockout === 'true',
      minRating: this.minRating() ?? undefined,
      tag: this.tag() || undefined,
      sort: this.sort()
    };
  }

  private resetPageAndReload() {
    this.page.set(0);
    this.reload();
  }
}
