import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of, switchMap, tap } from 'rxjs';
import {
  INTERVIEW_OPINION_LABELS, InterviewOpinion, InterviewReportsResponse
} from '../../../../../core/models/interview.models';
import { InterviewService } from '../../../../../core/services/interview.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

const MAX_REPORT = 5000;

/**
 * Comptes rendus d'un entretien réalisé (interne, RG7).
 * RG10 : un participant ne voit ceux de ses collègues qu'après avoir rendu le sien.
 */
@Component({
  selector: 'app-interview-reports',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './interview-reports.html',
  styleUrl: './interview-reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewReports {
  private api = inject(InterviewService);
  private fb = inject(FormBuilder);

  applicationId = input.required<number>();
  interviewId = input.required<number>();

  data = signal<InterviewReportsResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  editing = signal(false);
  saving = signal(false);
  formError = signal<string | null>(null);
  message = signal<string | null>(null);
  readonly maxReport = MAX_REPORT;

  readonly opinionLabels = INTERVIEW_OPINION_LABELS;
  readonly opinions = (Object.keys(INTERVIEW_OPINION_LABELS) as InterviewOpinion[])
    .map(value => ({ value, label: INTERVIEW_OPINION_LABELS[value] }));

  form = this.fb.group({
    opinion: this.fb.control<InterviewOpinion | null>(null, Validators.required),
    content: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(MAX_REPORT)])
  });

  /** Formulaire affiché : pas encore de compte rendu, ou modification en cours. */
  showForm = computed(() => {
    const d = this.data();
    return !!d && d.canWrite && (d.mine === null || this.editing());
  });

  private target = computed(() => ({ applicationId: this.applicationId(), interviewId: this.interviewId() }));

  constructor() {
    toObservable(this.target).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(t => this.api.reports(t.applicationId, t.interviewId).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(d => {
      this.loading.set(false);
      this.data.set(d);
    });
  }

  edit() {
    const mine = this.data()?.mine;
    if (!mine) return;
    this.form.reset({ opinion: mine.opinion, content: mine.content });
    this.formError.set(null);
    this.editing.set(true);
  }

  cancelEdit() {
    this.editing.set(false);
  }

  submit() {
    const v = this.form.getRawValue();
    if (this.form.invalid || !v.opinion) {
      this.form.markAllAsTouched();
      this.formError.set(!v.opinion ? 'Choisissez votre avis.' : 'Rédigez votre compte rendu (5000 caractères maximum).');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.api.saveMyReport(this.applicationId(), this.interviewId(), { opinion: v.opinion, content: v.content.trim() })
      .subscribe({
        next: d => {
          this.saving.set(false);
          this.editing.set(false);
          this.form.reset({ opinion: null, content: '' });
          this.data.set(d);
          this.message.set(d.others.length
            ? 'Compte rendu enregistré. Les comptes rendus de vos collègues sont maintenant visibles.'
            : 'Compte rendu enregistré.');
        },
        error: err => {
          this.saving.set(false);
          this.formError.set(extractErrorMessage(err));
        }
      });
  }
}
