import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { REPORT_REASONS, JobReportReason } from '../../../../core/models/moderation.models';
import { PublicService } from '../../../../core/services/public.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';

/** « Signaler cette offre » : formulaire dépliable, sans compte nécessaire. */
@Component({
  selector: 'app-report-job',
  template: `
    @if (sent()) {
      <p class="form-info" role="status">Merci : votre signalement a été transmis à la modération.</p>
    } @else if (!open()) {
      <button type="button" class="link" (click)="toggle()" [attr.aria-expanded]="false" aria-controls="report-form">
        Signaler cette offre
      </button>
    } @else {
      <form id="report-form" class="report" (submit)="$event.preventDefault(); send()" aria-labelledby="report-title">
        <h2 id="report-title" #title tabindex="-1">Signaler cette offre</h2>
        <fieldset>
          <legend>Motif</legend>
          @for (r of reasons; track r.value) {
            <label class="check">
              <input type="radio" name="report-reason" [value]="r.value" [checked]="reason() === r.value"
                     (change)="reason.set(r.value)" />
              {{ r.label }} @if (r.hint) { <small class="muted">({{ r.hint }})</small> }
            </label>
          }
        </fieldset>
        <div class="field">
          <label for="report-comment">Précisions (facultatif)</label>
          <textarea id="report-comment" rows="3" maxlength="2000" [value]="comment()"
                    (input)="comment.set($any($event.target).value)"></textarea>
        </div>
        @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
        <div class="actions">
          <button type="submit" [disabled]="busy()">{{ busy() ? 'Envoi…' : 'Envoyer le signalement' }}</button>
          <button type="button" (click)="open.set(false)" [disabled]="busy()">Annuler</button>
        </div>
      </form>
    }
  `,
  styles: `
    .link { background: none; border: 0; padding: 0; color: var(--primary); text-decoration: underline; cursor: pointer; }
    .report { display: flex; flex-direction: column; gap: .6rem; }
    .report h2 { margin: 0; font-size: 1.05rem; }
    fieldset { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .3rem; }
    legend { font-weight: 600; margin-bottom: .25rem; }
    textarea { width: 100%; font: inherit; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportJob {
  private api = inject(PublicService);

  jobId = input.required<number>();
  readonly reasons = REPORT_REASONS;
  open = signal(false);
  reason = signal<JobReportReason | null>(null);
  comment = signal('');
  busy = signal(false);
  sent = signal(false);
  error = signal<string | null>(null);
  private title = viewChild<ElementRef<HTMLElement>>('title');

  toggle() {
    this.open.set(true);
    setTimeout(() => this.title()?.nativeElement.focus());
  }

  send() {
    const reason = this.reason();
    if (!reason) {
      this.error.set('Choisissez un motif.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.reportJob(this.jobId(), { reason, comment: this.comment().trim() || null }).subscribe({
      next: () => {
        this.busy.set(false);
        this.sent.set(true);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
