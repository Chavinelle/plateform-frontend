import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import {
  QUESTION_TYPE_LABELS, TestAttemptDetail, TestAttemptView, isChoice
} from '../../../../../core/models/test.models';
import { TestAttemptService } from '../../../../../core/services/test-attempt.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { AnswerGrader } from '../answer-grader/answer-grader';

/** Réponses d'un passage remis : QCM corrigés automatiquement, notation des questions ouvertes et du code. */
@Component({
  selector: 'app-test-attempt-review',
  imports: [DecimalPipe, AnswerGrader],
  templateUrl: './test-attempt-review.html',
  styleUrl: './test-attempt-review.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestAttemptReview {
  private api = inject(TestAttemptService);

  applicationId = input.required<number>();
  attemptId = input.required<number>();
  /** Passage recalculé après une note (pour mettre à jour la liste). */
  changed = output<TestAttemptView>();

  readonly typeLabels = QUESTION_TYPE_LABELS;
  readonly isChoice = isChoice;
  detail = signal<TestAttemptDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  announce = signal('');

  constructor() {
    toObservable(computed(() => ({ app: this.applicationId(), attempt: this.attemptId() }))).pipe(
      tap(() => this.loading.set(true)),
      switchMap(q => this.api.detail(q.app, q.attempt).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(d => {
      this.loading.set(false);
      this.detail.set(d);
    });
  }

  onGraded(d: TestAttemptDetail) {
    this.detail.set(d);
    this.changed.emit(d.attempt);
    const left = d.attempt.ungradedCount;
    this.announce.set(left
      ? `Note enregistrée. ${left} question${left > 1 ? 's' : ''} restant à corriger.`
      : `Note enregistrée. Correction terminée : ${d.attempt.scorePercent} %.`);
  }
}
