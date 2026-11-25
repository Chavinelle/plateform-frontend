import { DecimalPipe, formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import { APPLICATION_SOURCE_LABELS } from '../../../../core/models/application.models';
import { Granularity, RecruitmentStats } from '../../../../core/models/stats.models';
import { JobService } from '../../../../core/services/job.service';
import { StatsService } from '../../../../core/services/stats.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { filenameFrom, readBlobError, saveBlob } from '../../../../core/utils/download';
import { BarItem, BarList } from '../../../shared/charts/bar-list/bar-list';
import { ColumnChart, ColumnItem } from '../../../shared/charts/column-chart/column-chart';
import { FunnelChart, FunnelStep } from '../../../shared/charts/funnel-chart/funnel-chart';
import { Loading } from '../../../shared/loading/loading';

type Preset = '7' | '30' | '90' | '365' | 'custom';

/** Tableau de bord recruteur : indicateurs clés, candidatures dans le temps, par source, par offre ou par étape. */
@Component({
  selector: 'app-dashboard',
  imports: [Loading, DecimalPipe, BarList, ColumnChart, FunnelChart],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard {
  private api = inject(StatsService);
  private jobApi = inject(JobService);
  private locale = inject(LOCALE_ID);

  readonly presets: { value: Preset; label: string }[] = [
    { value: '7', label: '7 derniers jours' },
    { value: '30', label: '30 derniers jours' },
    { value: '90', label: '90 derniers jours' },
    { value: '365', label: '12 derniers mois' },
    { value: 'custom', label: 'Dates précises' }
  ];
  preset = signal<Preset>('90');
  customFrom = signal(this.iso(this.daysAgo(89)));
  customTo = signal(this.iso(new Date()));
  jobId = signal<number | null>(null);
  jobs = signal<{ id: number; title: string }[]>([]);

  stats = signal<RecruitmentStats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private range = computed(() => {
    const p = this.preset();
    if (p === 'custom') return { from: this.customFrom(), to: this.customTo() };
    return { from: this.iso(this.daysAgo(Number(p) - 1)), to: this.iso(new Date()) };
  });

  // ---- données des graphiques ----
  timeline = computed<ColumnItem[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return s.timeline.map(b => ({
      label: this.short(b.start, s.period.granularity),
      fullLabel: this.full(b.start, s.period.granularity),
      value: b.applications
    }));
  });
  sources = computed<BarItem[]>(() => (this.stats()?.bySource ?? [])
    .map(x => ({ key: x.source, label: APPLICATION_SOURCE_LABELS[x.source], value: x.count })));
  byJob = computed<BarItem[]>(() => (this.stats()?.byJob ?? []).slice(0, 10)
    .map(x => ({ key: String(x.jobId), label: x.title, value: x.applications,
      note: x.hired ? `${x.hired} embauche${x.hired > 1 ? 's' : ''}` : undefined })));
  byStage = computed<BarItem[]>(() => (this.stats()?.byStage ?? [])
    .map(x => ({ key: String(x.stageId), label: x.name, value: x.current, note: `atteinte par ${x.reached}` })));
  /** Entonnoir global, calculé par le serveur (reçues → examinées → entretien → embauchées). */
  funnel = computed<FunnelStep[]>(() => this.stats()?.conversion ?? []);
  /**
   * Offre choisie : ses étapes dans l'ordre du pipeline, d'après le nombre de candidatures qui les ont atteintes.
   * L'étape de rejet est une sortie, pas une étape de l'entonnoir.
   */
  stageFunnel = computed<FunnelStep[]>(() => {
    const stages = (this.stats()?.byStage ?? []).filter(s => s.kind !== 'REJET');
    const total = stages[0]?.reached ?? 0;
    return stages.map((s, i) => {
      const previous = i === 0 ? null : stages[i - 1].reached;
      return {
        key: String(s.stageId), label: s.name, count: s.reached,
        rate: total ? Math.round(s.reached * 1000 / total) / 10 : null,
        fromPrevious: previous ? Math.round(s.reached * 1000 / previous) / 10 : null
      };
    });
  });
  granularityLabel = computed(() => ({ DAY: 'par jour', WEEK: 'par semaine', MONTH: 'par mois' })[this.stats()?.period.granularity ?? 'DAY']);

  constructor() {
    this.jobApi.search({ page: 0, size: 50 }).pipe(catchError(() => of(null)), takeUntilDestroyed()).subscribe(page => {
      if (page) this.jobs.set(page.content.map(j => ({ id: j.id, title: j.title })));
    });

    toObservable(computed(() => ({ ...this.range(), jobId: this.jobId() }))).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(q => this.api.recruitment(q).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(s => {
      this.loading.set(false);
      if (s) this.stats.set(s);
    });
  }

  exporting = signal<'XLSX' | 'PDF' | null>(null);
  exportMessage = signal<string | null>(null);

  /** Télécharge le rapport avec les filtres affichés. */
  exportAs(format: 'XLSX' | 'PDF') {
    this.exporting.set(format);
    this.error.set(null);
    this.exportMessage.set(null);
    this.api.export({ ...this.range(), jobId: this.jobId() }, format).subscribe({
      next: res => {
        this.exporting.set(null);
        if (res.body) saveBlob(res.body, filenameFrom(res, `rapport-recrutement.${format === 'PDF' ? 'pdf' : 'xlsx'}`));
        this.exportMessage.set(`Rapport ${format === 'PDF' ? 'PDF' : 'Excel'} téléchargé.`);
      },
      error: err => {
        this.exporting.set(null);
        readBlobError(err).then(message => this.error.set(message));
      }
    });
  }

  setPreset(value: string) {
    this.preset.set(value as Preset);
  }

  setJob(value: string) {
    this.jobId.set(value ? Number(value) : null);
  }

  // ---- outils de dates ----
  private daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  }

  private iso(d: Date): string {
    return formatDate(d, 'yyyy-MM-dd', this.locale);
  }

  private short(start: string, g: Granularity): string {
    return formatDate(start, g === 'MONTH' ? 'MMM yy' : 'd MMM', this.locale);
  }

  private full(start: string, g: Granularity): string {
    if (g === 'WEEK') return 'semaine du ' + formatDate(start, 'd MMMM y', this.locale);
    if (g === 'MONTH') return formatDate(start, 'MMMM y', this.locale);
    return formatDate(start, 'EEEE d MMMM y', this.locale);
  }
}
