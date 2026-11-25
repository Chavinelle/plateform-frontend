import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { ATTEMPT_STATUS_LABELS, OnlineTest, TestAttemptView } from '../../../../../core/models/test.models';
import { OnlineTestService } from '../../../../../core/services/online-test.service';
import { TestAttemptService } from '../../../../../core/services/test-attempt.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { TestAttemptReview } from '../test-attempt-review/test-attempt-review';
import { Loading } from '../../../../shared/loading/loading';

/** Tests en ligne d'une candidature : envois, statut des passages, envoi d'un nouveau test. */
@Component({
  selector: 'app-tests-panel',
  imports: [Loading, DatePipe, DecimalPipe, ReactiveFormsModule, TestAttemptReview],
  templateUrl: './tests-panel.html',
  styleUrl: './tests-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestsPanel {
  private api = inject(TestAttemptService);
  private testApi = inject(OnlineTestService);
  private fb = inject(FormBuilder);

  applicationId = input.required<number>();
  /** Envoyer un test : RH, candidature ni retirée ni rejetée. */
  canSend = input(false);
  /** Annuler un envoi : RH (un manager consulte seulement). */
  canManage = input(false);

  readonly statusLabels = ATTEMPT_STATUS_LABELS;
  attempts = signal<TestAttemptView[]>([]);
  tests = signal<OnlineTest[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  sending = signal(false);
  showForm = signal(false);
  confirmCancelId = signal<number | null>(null);
  busyId = signal<number | null>(null);
  /** Passage dont les réponses sont affichées. */
  reviewId = signal<number | null>(null);

  /** Tests envoyables : avec des questions, et pas déjà en attente ou en cours pour ce candidat. */
  sendable = computed(() => {
    const open = new Set(this.attempts()
      .filter(a => a.status === 'ENVOYE' || a.status === 'COMMENCE')
      .map(a => a.testId));
    return this.tests().filter(t => t.questionCount > 0 && !open.has(t.id));
  });

  form = this.fb.nonNullable.group({
    testId: this.fb.control<number | null>(null, Validators.required),
    deadlineDays: [7, [Validators.required, Validators.min(1), Validators.max(30)]],
    message: ['', Validators.maxLength(2000)]
  });

  private tick = signal(0);

  constructor() {
    toObservable(computed(() => ({ id: this.applicationId(), tick: this.tick() }))).pipe(
      tap(() => this.error.set(null)),
      switchMap(q => forkJoin({
        attempts: this.api.list(q.id),
        tests: this.testApi.list().pipe(catchError(() => of([] as OnlineTest[])))
      }).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(res => {
      this.loading.set(false);
      if (!res) return;
      this.attempts.set(res.attempts);
      this.tests.set(res.tests);
      const current = this.form.controls.testId.value;
      if (!this.sendable().some(t => t.id === current)) {
        this.form.controls.testId.setValue(this.sendable()[0]?.id ?? null);
      }
    });
  }

  openForm() {
    this.message.set(null);
    this.error.set(null);
    this.showForm.set(true);
  }

  send() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Choisissez un test et un délai entre 1 et 30 jours.');
      return;
    }
    const v = this.form.getRawValue();
    this.sending.set(true);
    this.error.set(null);
    this.message.set(null);
    this.api.send(this.applicationId(), {
      testId: Number(v.testId),
      deadlineDays: Number(v.deadlineDays),
      message: v.message.trim() || null
    }).subscribe({
      next: a => {
        this.sending.set(false);
        this.showForm.set(false);
        this.form.patchValue({ message: '' });
        this.message.set(`Test « ${a.testTitle} » envoyé : le candidat a reçu son lien par e-mail.`);
        this.reload();
      },
      error: err => {
        this.sending.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  cancel(a: TestAttemptView) {
    this.busyId.set(a.id);
    this.error.set(null);
    this.message.set(null);
    this.api.cancel(this.applicationId(), a.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.confirmCancelId.set(null);
        this.message.set(`Envoi du test « ${a.testTitle} » annulé ; le candidat en est informé.`);
        this.reload();
      },
      error: err => {
        this.busyId.set(null);
        this.confirmCancelId.set(null);
        this.error.set(extractErrorMessage(err));
        this.reload();
      }
    });
  }

  toggleReview(id: number) {
    this.reviewId.update(current => (current === id ? null : id));
  }

  /** Note enregistrée : le passage recalculé remplace l'ancien dans la liste. */
  onReviewed(view: TestAttemptView) {
    this.attempts.update(list => list.map(a => (a.id === view.id ? view : a)));
  }

  invalid(control: { invalid: boolean; touched: boolean; dirty: boolean }): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  reload() {
    this.tick.update(n => n + 1);
  }
}
