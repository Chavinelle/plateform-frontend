import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { EvaluationTemplate, EvaluationView, EvaluationsResponse } from '../../../../../core/models/evaluation.models';
import { InterviewView } from '../../../../../core/models/interview.models';
import { EvaluationTemplateService } from '../../../../../core/services/evaluation-template.service';
import { EvaluationService } from '../../../../../core/services/evaluation.service';
import { InterviewService } from '../../../../../core/services/interview.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { EvaluationCard } from '../evaluation-card/evaluation-card';
import { EvaluationForm } from '../evaluation-form/evaluation-form';

/**
 * Évaluations d'une candidature : score global, mes évaluations, celles des collègues.
 * RG10 : le serveur ne renvoie les évaluations des autres qu'après la soumission de la mienne.
 */
@Component({
  selector: 'app-evaluations-panel',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, EvaluationCard, EvaluationForm],
  templateUrl: './evaluations-panel.html',
  styleUrl: './evaluations-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvaluationsPanel {
  private api = inject(EvaluationService);
  private templateApi = inject(EvaluationTemplateService);
  private interviewApi = inject(InterviewService);
  private fb = inject(FormBuilder);

  applicationId = input.required<number>();
  /** Candidature retirée : plus de nouvelle évaluation. */
  canStart = input(true);

  data = signal<EvaluationsResponse | null>(null);
  templates = signal<EvaluationTemplate[]>([]);
  interviews = signal<InterviewView[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  starting = signal(false);
  message = signal<string | null>(null);

  startForm = this.fb.group({
    templateId: this.fb.control<number | null>(null),
    interviewId: this.fb.control<number | null>(null)
  });

  drafts = computed(() => (this.data()?.mine ?? []).filter(e => e.status === 'BROUILLON'));
  mySubmitted = computed(() => (this.data()?.mine ?? []).filter(e => e.status === 'SOUMISE'));
  /** Grilles avec lesquelles je n'ai pas encore commencé d'évaluation. */
  availableTemplates = computed(() => {
    const used = new Set((this.data()?.mine ?? []).map(e => e.templateId));
    return this.templates().filter(t => !used.has(t.id));
  });
  doneInterviews = computed(() => this.interviews().filter(i => i.status === 'REALISE'));

  private tick = signal(0);

  constructor() {
    toObservable(computed(() => ({ id: this.applicationId(), tick: this.tick() }))).pipe(
      tap(() => this.error.set(null)),
      switchMap(q => forkJoin({
        data: this.api.list(q.id),
        templates: this.templateApi.list().pipe(catchError(() => of([] as EvaluationTemplate[]))),
        interviews: this.interviewApi.list(q.id).pipe(catchError(() => of([] as InterviewView[])))
      }).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(res => {
      this.loading.set(false);
      if (!res) return;
      this.data.set(res.data);
      this.templates.set(res.templates);
      this.interviews.set(res.interviews);
      const preferred = this.availableTemplates().find(t => t.defaultTemplate) ?? this.availableTemplates()[0];
      this.startForm.patchValue({ templateId: preferred?.id ?? null, interviewId: null });
    });
  }

  start() {
    const v = this.startForm.getRawValue();
    if (v.templateId === null) return;
    this.starting.set(true);
    this.error.set(null);
    this.message.set(null);
    this.api.create(this.applicationId(), Number(v.templateId), v.interviewId === null ? null : Number(v.interviewId))
      .subscribe({
        next: () => {
          this.starting.set(false);
          this.reload();
        },
        error: err => {
          this.starting.set(false);
          this.error.set(extractErrorMessage(err));
        }
      });
  }

  onChanged(e: EvaluationView) {
    if (e.status === 'SOUMISE') {
      // la liste complète (évaluations des collègues, score global) dépend de RG10 : on la recharge
      this.message.set('Évaluation soumise. Les évaluations de vos collègues sont maintenant visibles.');
      this.reload();
      return;
    }
    this.data.update(d => d && { ...d, mine: d.mine.map(x => (x.id === e.id ? e : x)) });
  }

  onDeleted() {
    this.message.set('Brouillon supprimé.');
    this.reload();
  }

  reload() {
    this.tick.update(n => n + 1);
  }
}
