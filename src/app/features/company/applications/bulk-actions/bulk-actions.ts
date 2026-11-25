import {
  ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal, viewChild
} from '@angular/core';
import {
  BulkMoveRequest, BulkMoveResponse, RecruiterApplicationItem, RejectDecision
} from '../../../../../core/models/application.models';
import { Stage } from '../../../../../core/models/company.models';
import { RecruiterApplicationService } from '../../../../../core/services/recruiter-application.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { RejectForm } from '../reject-form/reject-form';
import { BulkMessageForm } from '../bulk-message-form/bulk-message-form';
import { BulkMessageResponse } from '../../../../../core/models/message.models';

/** Barre d'actions sur les candidatures cochées : déplacer vers une étape ou rejeter en une fois. */
@Component({
  selector: 'app-bulk-actions',
  imports: [RejectForm, BulkMessageForm],
  templateUrl: './bulk-actions.html',
  styleUrl: './bulk-actions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BulkActions {
  private api = inject(RecruiterApplicationService);

  jobId = input.required<number>();
  stages = input.required<Stage[]>();
  selection = input.required<RecruiterApplicationItem[]>();
  done = output<BulkMoveResponse>();
  messaged = output<BulkMessageResponse>();
  cleared = output<void>();

  targetId = signal<number | null>(null);
  busy = signal(false);
  error = signal<string | null>(null);
  rejecting = signal(false);
  private dialog = viewChild<ElementRef<HTMLDialogElement>>('rejectDialog');
  writing = signal(false);
  private messageDialog = viewChild<ElementRef<HTMLDialogElement>>('messageDialog');
  private messageButton = viewChild<ElementRef<HTMLButtonElement>>('messageButton');

  target = computed(() => this.stages().find(s => s.id === this.targetId()) ?? null);
  count = computed(() => this.selection().length);

  onTarget(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.targetId.set(value === '' ? null : Number(value));
    this.error.set(null);
  }

  apply() {
    const target = this.target();
    if (!target) {
      this.error.set('Choisissez une étape.');
      return;
    }
    const n = this.count();
    if (target.kind === 'REJET') {
      this.rejecting.set(true);
      this.dialog()?.nativeElement.showModal();
      return;
    }
    const label = target.kind === 'EMBAUCHE'
      ? `Marquer ${n} candidat(s) comme embauché(s) ?`
      : `Déplacer ${n} candidature(s) vers « ${target.name} » ?`;
    if (!confirm(label)) return;
    this.send({ applicationIds: this.ids(), stageId: target.id, reason: null });
  }

  reject(decision: RejectDecision) {
    const target = this.target();
    if (!target) return;
    this.send({ applicationIds: this.ids(), stageId: target.id, ...decision }, true);
  }

  closeDialog() {
    this.dialog()?.nativeElement.close();
    this.rejecting.set(false);
  }

  openMessage() {
    this.error.set(null);
    this.writing.set(true);
    this.messageDialog()?.nativeElement.showModal();
  }

  closeMessage() {
    this.messageDialog()?.nativeElement.close();
    this.writing.set(false);
    this.messageButton()?.nativeElement.focus();
  }

  onMessaged(res: BulkMessageResponse) {
    this.messageDialog()?.nativeElement.close();
    this.writing.set(false);
    this.messaged.emit(res);
  }

  private send(body: BulkMoveRequest, fromDialog = false) {
    this.busy.set(true);
    this.error.set(null);
    this.api.bulkMove(this.jobId(), body).subscribe({
      next: res => {
        this.busy.set(false);
        if (fromDialog) this.closeDialog();
        this.targetId.set(null);
        this.done.emit(res);
      },
      error: err => {
        this.busy.set(false);
        if (fromDialog) this.closeDialog();
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  private ids(): number[] {
    return this.selection().map(a => a.id);
  }
}
