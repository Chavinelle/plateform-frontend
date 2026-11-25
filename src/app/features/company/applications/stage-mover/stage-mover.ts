import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MoveStageRequest, RecruiterApplicationDetail, RejectDecision } from '../../../../../core/models/application.models';
import { Stage } from '../../../../../core/models/company.models';
import { RecruiterApplicationService } from '../../../../../core/services/recruiter-application.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { blankToNull } from '../../../../../core/utils/text';
import { RejectForm } from '../reject-form/reject-form';

const MAX_REASON = 1000;

/** Formulaire « Faire avancer la candidature » : choix de l'étape, motif, et message en cas de rejet. */
@Component({
  selector: 'app-stage-mover',
  imports: [ReactiveFormsModule, RejectForm],
  templateUrl: './stage-mover.html',
  styleUrl: './stage-mover.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StageMover {
  private fb = inject(FormBuilder);
  private api = inject(RecruiterApplicationService);

  application = input.required<RecruiterApplicationDetail>();
  stages = input.required<Stage[]>();
  moved = output<RecruiterApplicationDetail>();

  busy = signal(false);
  error = signal<string | null>(null);
  submitted = signal(false);
  readonly maxReason = MAX_REASON;

  form = this.fb.group({
    stageId: this.fb.control<number | null>(null, Validators.required),
    reason: this.fb.nonNullable.control('', Validators.maxLength(MAX_REASON))
  });

  private stageId = toSignal(this.form.controls.stageId.valueChanges, { initialValue: null });

  /** Toutes les étapes sauf l'étape actuelle. */
  options = computed(() => this.stages().filter(s => s.id !== this.application().stageId));
  target = computed(() => this.stages().find(s => s.id === this.stageId()) ?? null);
  isReject = computed(() => this.target()?.kind === 'REJET');

  submit() {
    this.submitted.set(true);
    const target = this.target();
    if (this.form.invalid || !target) return;

    const app = this.application();
    if (target.kind === 'EMBAUCHE' && !confirm(`Marquer ${app.candidate.firstName} ${app.candidate.lastName} comme embauché(e) ?`)) return;
    this.send({ stageId: target.id, expectedStageId: app.stageId, reason: blankToNull(this.form.controls.reason.value) });
  }

  reject(decision: RejectDecision) {
    const target = this.target();
    if (!target) return;
    this.send({ stageId: target.id, expectedStageId: this.application().stageId, ...decision });
  }

  cancelReject() {
    this.form.controls.stageId.setValue(null);
  }

  private send(body: MoveStageRequest) {
    this.busy.set(true);
    this.error.set(null);
    this.api.moveToStage(this.application().id, body).subscribe({
      next: updated => {
        this.busy.set(false);
        this.submitted.set(false);
        this.form.reset({ stageId: null, reason: '' });
        this.moved.emit(updated);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
