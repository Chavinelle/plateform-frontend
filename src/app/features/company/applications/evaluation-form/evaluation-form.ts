import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { EvaluationSaveRequest, EvaluationView } from '../../../../../core/models/evaluation.models';
import { INTERVIEW_OPINION_LABELS, InterviewOpinion } from '../../../../../core/models/interview.models';
import { EvaluationService } from '../../../../../core/services/evaluation.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

type ScoreForm = FormGroup<{ score: FormControl<number | null>; comment: FormControl<string> }>;

/** Saisie d'une évaluation en brouillon, puis soumission définitive. */
@Component({
  selector: 'app-evaluation-form',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './evaluation-form.html',
  styleUrl: './evaluation-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvaluationForm {
  private fb = inject(FormBuilder);
  private api = inject(EvaluationService);

  applicationId = input.required<number>();
  evaluation = input.required<EvaluationView>();
  /** Brouillon enregistré ou évaluation soumise. */
  changed = output<EvaluationView>();
  deleted = output<number>();
  /** 409 : modifiée ailleurs, le parent recharge. */
  stale = output<void>();

  busy = signal<'save' | 'submit' | 'delete' | null>(null);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  confirmSubmit = signal(false);

  readonly opinions = (Object.keys(INTERVIEW_OPINION_LABELS) as InterviewOpinion[])
    .map(value => ({ value, label: INTERVIEW_OPINION_LABELS[value] }));
  readonly notes = [1, 2, 3, 4, 5];
  readonly noteLabels: Record<number, string> = { 1: 'insuffisant', 2: 'faible', 3: 'correct', 4: 'bon', 5: 'excellent' };

  form = this.fb.group({
    opinion: this.fb.control<InterviewOpinion | null>(null),
    comment: this.fb.nonNullable.control('', Validators.maxLength(4000)),
    scores: this.fb.array<ScoreForm>([])
  });

  get scores(): FormArray<ScoreForm> {
    return this.form.controls.scores;
  }

  private values = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), { requireSync: true });

  /** Score provisoire (même calcul que le serveur), affiché seulement quand tout est noté. */
  preview = computed(() => {
    const criteria = this.evaluation().scores;
    const notes = (this.values().scores ?? []).map(s => s?.score ?? null);
    if (notes.length !== criteria.length || notes.some(n => n === null)) return null;
    const weights = criteria.reduce((sum, c) => sum + c.weight, 0);
    const weighted = criteria.reduce((sum, c, i) => sum + c.weight * (notes[i] as number), 0);
    return Math.round(weighted * 20 / weights * 10) / 10;
  });
  remaining = computed(() => (this.values().scores ?? []).filter(s => !s?.score).length
    + (this.values().opinion ? 0 : 1));

  constructor() {
    effect(() => {
      const e = this.evaluation();
      this.scores.clear();
      e.scores.forEach(s => this.scores.push(this.fb.group({
        score: this.fb.control<number | null>(s.score),
        comment: this.fb.nonNullable.control(s.comment ?? '', Validators.maxLength(1000))
      })));
      this.form.patchValue({ opinion: e.opinion, comment: e.comment ?? '' });
      this.confirmSubmit.set(false);
    });
  }

  save() {
    this.send('save');
  }

  askSubmit() {
    this.error.set(null);
    if (this.remaining() > 0) {
      this.error.set(`Il reste ${this.remaining()} élément(s) à remplir (notes et avis final) avant de soumettre.`);
      return;
    }
    this.confirmSubmit.set(true);
  }

  submit() {
    this.send('submit');
  }

  remove() {
    this.busy.set('delete');
    this.api.deleteDraft(this.applicationId(), this.evaluation().id).subscribe({
      next: () => {
        this.busy.set(null);
        this.deleted.emit(this.evaluation().id);
      },
      error: err => this.fail(err)
    });
  }

  private send(kind: 'save' | 'submit') {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Commentaire trop long.');
      return;
    }
    const v = this.form.getRawValue();
    const e = this.evaluation();
    const body: EvaluationSaveRequest = {
      version: e.version,
      opinion: v.opinion,
      comment: v.comment.trim() || null,
      scores: e.scores.map((s, i) => ({
        scoreId: s.id,
        score: v.scores[i].score,
        comment: v.scores[i].comment.trim() || null
      }))
    };
    this.busy.set(kind);
    this.error.set(null);
    this.message.set(null);
    const request = kind === 'submit'
      ? this.api.submit(this.applicationId(), e.id, body)
      : this.api.saveDraft(this.applicationId(), e.id, body);
    request.subscribe({
      next: saved => {
        this.busy.set(null);
        this.message.set(kind === 'save' ? 'Brouillon enregistré.' : null);
        this.changed.emit(saved);
      },
      error: err => this.fail(err)
    });
  }

  private fail(err: unknown) {
    this.busy.set(null);
    this.confirmSubmit.set(false);
    this.error.set(extractErrorMessage(err));
    if (err instanceof HttpErrorResponse && err.status === 409) this.stale.emit();
  }
}
