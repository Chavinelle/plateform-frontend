import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, of, switchMap, tap } from 'rxjs';
import { APPLICATION_STATUS_LABELS } from '../../../../../core/models/application.models';
import { ApplicationComparison, ComparedCandidate, MAX_COMPARE, MIN_COMPARE } from '../../../../../core/models/comparison.models';
import { INTERVIEW_OPINION_LABELS, InterviewOpinion } from '../../../../../core/models/interview.models';
import { ATTEMPT_STATUS_LABELS } from '../../../../../core/models/test.models';
import { RecruiterApplicationService } from '../../../../../core/services/recruiter-application.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

interface TestRow { testId: number; title: string }

/** Comparaison côte à côte de 2 à 4 candidats d'une offre (un candidat par colonne). */
@Component({
  selector: 'app-candidate-comparison',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './candidate-comparison.html',
  styleUrl: './candidate-comparison.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CandidateComparison {
  private route = inject(ActivatedRoute);
  private api = inject(RecruiterApplicationService);

  readonly statusLabels = APPLICATION_STATUS_LABELS;
  readonly attemptLabels = ATTEMPT_STATUS_LABELS;
  readonly opinions = Object.keys(INTERVIEW_OPINION_LABELS) as InterviewOpinion[];
  readonly opinionLabels = INTERVIEW_OPINION_LABELS;

  jobId = signal<number | null>(null);
  data = signal<ApplicationComparison | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  candidates = computed(() => this.data()?.candidates ?? []);
  anyHidden = computed(() => this.candidates().some(c => !c.evaluationsVisible));

  /** Tests passés par au moins un des candidats. */
  testRows = computed<TestRow[]>(() => {
    const rows = new Map<number, string>();
    for (const c of this.candidates()) for (const t of c.tests) rows.set(t.testId, t.testTitle);
    return [...rows].map(([testId, title]) => ({ testId, title })).sort((a, b) => a.title.localeCompare(b.title));
  });

  // meilleures valeurs par ligne (mises en évidence, à égalité toutes le sont)
  bestScore = computed(() => this.best(this.candidates().map(c => c.globalScore)));
  bestCriteria = computed(() => (this.data()?.criteria ?? []).map((_, i) =>
    this.best(this.candidates().map(c => c.criteriaAverages[i] ?? null))));
  bestTests = computed(() => new Map(this.testRows().map(row =>
    [row.testId, this.best(this.candidates().map(c => this.testOf(c, row.testId)?.scorePercent ?? null))])));

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(([pm, qm]) => {
        const jobId = Number(pm.get('id'));
        const ids = (qm.get('ids') ?? '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0);
        this.jobId.set(Number.isInteger(jobId) ? jobId : null);
        if (!Number.isInteger(jobId) || ids.length < MIN_COMPARE || ids.length > MAX_COMPARE) {
          this.error.set(`Choisissez de ${MIN_COMPARE} à ${MAX_COMPARE} candidats dans la liste des candidatures.`);
          return of(null);
        }
        return this.api.compare(jobId, ids).pipe(catchError(err => {
          this.error.set(extractErrorMessage(err));
          return of(null);
        }));
      }),
      takeUntilDestroyed()
    ).subscribe(d => {
      this.loading.set(false);
      this.data.set(d);
    });
  }

  testOf(c: ComparedCandidate, testId: number) {
    return c.tests.find(t => t.testId === testId) ?? null;
  }

  opinionCount(c: ComparedCandidate, o: InterviewOpinion): number {
    return c.opinions[o] ?? 0;
  }

  /** Indices des colonnes qui ont la meilleure valeur (aucun si moins de deux valeurs à comparer). */
  private best(values: (number | null)[]): Set<number> {
    const present = values.filter((v): v is number => v !== null);
    if (present.length < 2) return new Set();
    const max = Math.max(...present);
    return new Set(values.flatMap((v, i) => (v === max ? [i] : [])));
  }
}
