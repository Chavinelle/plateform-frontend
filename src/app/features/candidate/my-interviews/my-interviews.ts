import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of, switchMap, tap } from 'rxjs';
import {
  CandidateInterview, INTERVIEW_RESPONSE_LABELS, INTERVIEW_STATUS_LABELS, INTERVIEW_TYPE_LABELS,
  InterviewCandidateResponse
} from '../../../../core/models/interview.models';
import { ApplicationService } from '../../../../core/services/application.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { Loading } from '../../../shared/loading/loading';
import { EmptyState } from '../../../shared/empty-state/empty-state';

type AnswerMode = Exclude<InterviewCandidateResponse, 'ACCEPTE'>;

/** Entretiens d'une candidature côté candidat : consultation et réponse à l'invitation. */
@Component({
  selector: 'app-my-interviews',
  imports: [EmptyState, Loading, DatePipe, ReactiveFormsModule],
  templateUrl: './my-interviews.html',
  styleUrl: './my-interviews.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyInterviews {
  private api = inject(ApplicationService);

  applicationId = input.required<number>();

  interviews = signal<CandidateInterview[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  busyId = signal<number | null>(null);
  message = signal<string | null>(null);
  formError = signal<string | null>(null);
  /** Erreur d'une action sans formulaire (confirmation de présence). */
  actionError = signal<string | null>(null);

  /** Formulaire ouvert : refus ou autre créneau, pour un seul entretien à la fois. */
  answering = signal<{ id: number; mode: AnswerMode } | null>(null);
  comment = new FormControl('', { nonNullable: true, validators: Validators.maxLength(1000) });
  proposedAt = new FormControl('', { nonNullable: true });
  minProposed = signal('');

  readonly typeLabels = INTERVIEW_TYPE_LABELS;
  readonly statusLabels = INTERVIEW_STATUS_LABELS;
  readonly responseLabels = INTERVIEW_RESPONSE_LABELS;

  private formHeading = viewChild<ElementRef<HTMLElement>>('formHeading');

  constructor() {
    toObservable(this.applicationId).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
        this.answering.set(null);
      }),
      switchMap(id => this.api.interviews(id).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of([] as CandidateInterview[]);
      }))),
      takeUntilDestroyed()
    ).subscribe(list => {
      this.loading.set(false);
      this.interviews.set(list);
    });
  }

  accept(i: CandidateInterview) {
    this.send(i, 'ACCEPTE', null, null, 'Votre présence est confirmée. Merci !');
  }

  open(i: CandidateInterview, mode: AnswerMode) {
    this.comment.reset();
    this.proposedAt.reset();
    this.formError.set(null);
    this.minProposed.set(toLocalInput(new Date()));
    this.answering.set({ id: i.id, mode });
    setTimeout(() => this.formHeading()?.nativeElement.focus());
  }

  cancelAnswer() {
    this.answering.set(null);
  }

  submitAnswer(i: CandidateInterview) {
    const current = this.answering();
    if (!current) return;
    if (this.comment.invalid) {
      this.formError.set('Commentaire trop long (1000 caractères maximum).');
      return;
    }
    const proposed = this.proposedAt.value;
    if (current.mode === 'AUTRE_CRENEAU' && !proposed) {
      this.formError.set('Indiquez le créneau que vous proposez.');
      return;
    }
    this.send(i, current.mode, blankToNull(this.comment.value),
      current.mode === 'AUTRE_CRENEAU' ? proposed : null,
      current.mode === 'REFUSE'
        ? "Vous avez décliné l'entretien. L'entreprise a été prévenue."
        : "Votre proposition de créneau a été transmise à l'entreprise.");
  }

  private send(i: CandidateInterview, response: InterviewCandidateResponse,
               comment: string | null, proposedAt: string | null, success: string) {
    this.busyId.set(i.id);
    this.formError.set(null);
    this.actionError.set(null);
    this.message.set(null);
    this.api.respondToInterview(this.applicationId(), i.id, { version: i.version, response, comment, proposedAt }).subscribe({
      next: updated => {
        this.busyId.set(null);
        this.answering.set(null);
        this.interviews.update(list => list.map(x => (x.id === updated.id ? updated : x)));
        this.message.set(success);
      },
      error: err => {
        this.busyId.set(null);
        // 409 : l'entreprise a reporté ou annulé l'entretien entre-temps → on affiche la version à jour
        if (err instanceof HttpErrorResponse && err.status === 409) {
          this.answering.set(null);
          this.actionError.set(extractErrorMessage(err));
          this.api.interviews(this.applicationId()).subscribe(list => this.interviews.set(list));
          return;
        }
        if (this.answering()) this.formError.set(extractErrorMessage(err));
        else this.actionError.set(extractErrorMessage(err));
      }
    });
  }
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function blankToNull(value: string): string | null {
  const v = value.trim();
  return v === '' ? null : v;
}
