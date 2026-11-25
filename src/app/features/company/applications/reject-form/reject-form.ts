import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of, switchMap, tap } from 'rxjs';
import {
  CandidateMessage, REJECTION_REASONS, RejectDecision
} from '../../../../../core/models/application.models';
import { RecruiterApplicationService } from '../../../../../core/services/recruiter-application.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

const MAX_REASON = 1000;
const MAX_MESSAGE = 3000;
let nextId = 0;

/**
 * Formulaire de rejet : motif interne obligatoire (jamais montré au candidat)
 * et message envoyé au candidat, pré-rempli et modifiable (RG6).
 * Une candidature : [applicationId]. Rejet groupé : [jobId] et [recipientCount].
 */
@Component({
  selector: 'app-reject-form',
  imports: [ReactiveFormsModule],
  templateUrl: './reject-form.html',
  styleUrl: './reject-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RejectForm {
  private fb = inject(FormBuilder);
  private api = inject(RecruiterApplicationService);

  applicationId = input<number | null>(null);
  jobId = input<number | null>(null);
  recipientCount = input(1);
  busy = input(false);
  confirmed = output<RejectDecision>();
  cancelled = output<void>();

  readonly id = `reject-${nextId++}`;
  readonly reasons = REJECTION_REASONS;
  readonly maxReason = MAX_REASON;
  readonly maxMessage = MAX_MESSAGE;

  preview = signal<CandidateMessage | null>(null);
  previewError = signal<string | null>(null);
  submitted = signal(false);

  form = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.maxLength(MAX_REASON)]],
    notify: [true],
    message: ['', Validators.maxLength(MAX_MESSAGE)]
  });
  notify = toSignal(this.form.controls.notify.valueChanges, { initialValue: true });
  bulk = computed(() => this.applicationId() === null);
  private source = computed(() => ({ applicationId: this.applicationId(), jobId: this.jobId() }));

  constructor() {
    // message par défaut chargé pour chaque candidature
    toObservable(this.source).pipe(
      tap(() => {
        this.preview.set(null);
        this.previewError.set(null);
        this.submitted.set(false);
        this.form.reset({ reason: '', notify: true, message: '' });
      }),
      switchMap(({ applicationId, jobId }) => {
        const request = applicationId !== null ? this.api.rejectionMessage(applicationId)
          : jobId !== null ? this.api.rejectionTemplate(jobId) : null;
        return request ? request.pipe(catchError(err => {
          this.previewError.set(extractErrorMessage(err));
          return of(null);
        })) : of(null);
      }),
      takeUntilDestroyed()
    ).subscribe(msg => {
      this.preview.set(msg);
      if (msg) this.form.controls.message.setValue(msg.body);
    });
  }

  useReason(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select.value) this.form.controls.reason.setValue(select.value);
    select.value = '';
  }

  restoreMessage() {
    const msg = this.preview();
    if (msg) this.form.controls.message.setValue(msg.body);
  }

  submit() {
    this.submitted.set(true);
    if (this.form.invalid) return;
    const { reason, notify, message } = this.form.getRawValue();
    this.confirmed.emit({
      reason: reason.trim(),
      notifyCandidate: notify,
      candidateMessage: notify && message.trim() ? message.trim() : null   // vide : le serveur utilise le texte par défaut
    });
  }
}
