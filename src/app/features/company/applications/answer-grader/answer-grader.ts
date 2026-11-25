import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TestAnswerReview, TestAttemptDetail } from '../../../../../core/models/test.models';
import { TestAttemptService } from '../../../../../core/services/test-attempt.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

/** Note d'une question ouverte ou d'un exercice de code : points et commentaire interne (RG7). */
@Component({
  selector: 'app-answer-grader',
  imports: [ReactiveFormsModule],
  template: `
    <form class="grader" [formGroup]="form" (ngSubmit)="save()" novalidate>
      <div class="field points">
        <label [for]="'grade-points-' + answer().answerId">Points (sur {{ answer().points }})</label>
        <input [id]="'grade-points-' + answer().answerId" type="number" min="0" [max]="answer().points" step="0.5"
               formControlName="points" required
               [attr.aria-invalid]="form.controls.points.invalid && form.controls.points.touched" />
      </div>
      <div class="field comment">
        <label [for]="'grade-comment-' + answer().answerId">Commentaire interne</label>
        <textarea [id]="'grade-comment-' + answer().answerId" formControlName="comment" rows="2"
                  [attr.aria-describedby]="'grade-hint-' + answer().answerId"></textarea>
        <small [id]="'grade-hint-' + answer().answerId" class="muted">Jamais montré au candidat.</small>
      </div>
      @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
      <button type="submit" [disabled]="saving()">
        {{ saving() ? 'Enregistrement…' : (answer().pointsAwarded === null ? 'Enregistrer la note' : 'Modifier la note') }}
      </button>
    </form>
  `,
  styles: `
    .grader { display: flex; flex-wrap: wrap; gap: .5rem .75rem; align-items: flex-end; margin-top: .5rem; }
    .points input { width: 7rem; }
    .comment { flex: 1 1 16rem; }
    .comment textarea { width: 100%; font: inherit; }
    .form-error { flex-basis: 100%; margin: 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnswerGrader {
  private fb = inject(FormBuilder);
  private api = inject(TestAttemptService);

  applicationId = input.required<number>();
  attemptId = input.required<number>();
  answer = input.required<TestAnswerReview>();
  graded = output<TestAttemptDetail>();

  saving = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    points: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    comment: this.fb.nonNullable.control('', Validators.maxLength(2000))
  });

  constructor() {
    effect(() => {
      const a = this.answer();
      untracked(() => {
        this.form.reset({ points: a.pointsAwarded, comment: a.graderComment ?? '' });
        this.form.controls.points.setValidators([Validators.required, Validators.min(0), Validators.max(a.points)]);
        this.form.controls.points.updateValueAndValidity();
      });
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(`Indiquez une note entre 0 et ${this.answer().points}.`);
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.api.grade(this.applicationId(), this.attemptId(), this.answer().answerId, {
      points: Number(v.points),
      comment: v.comment.trim() || null
    }).subscribe({
      next: detail => {
        this.saving.set(false);
        this.graded.emit(detail);
      },
      error: err => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
