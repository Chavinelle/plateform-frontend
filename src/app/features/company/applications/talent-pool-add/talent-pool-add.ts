import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TalentPoolService } from '../../../../../core/services/talent-pool.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

/** « Ajouter au vivier » depuis la fiche candidature : note interne et étiquettes facultatives. */
@Component({
  selector: 'app-talent-pool-add',
  imports: [RouterLink],
  template: `
    <p class="sr-only" role="status" aria-live="polite">{{ message() }}</p>
    @if (message()) {
      <p class="form-info">{{ message() }} <a routerLink="/recruteur/vivier">Voir le vivier</a></p>
    }
    @if (!open()) {
      <button type="button" (click)="start()">Ajouter au vivier de talents</button>
    } @else {
      <form class="pool-form" (submit)="$event.preventDefault(); save()">
        <label for="pool-note">Note interne (facultative, jamais montrée au candidat)</label>
        <textarea #noteInput id="pool-note" rows="2" maxlength="2000" [value]="note()" (input)="note.set($any($event.target).value)"></textarea>
        <label for="pool-tags">Étiquettes (séparées par des virgules)</label>
        <input id="pool-tags" [value]="tags()" (input)="tags.set($any($event.target).value)" placeholder="Ex. Senior, Mobile" />
        <p class="muted small">Le candidat sera informé par e-mail et pourra se retirer du vivier à tout moment.</p>
        @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
        <div class="actions">
          <button type="submit" [disabled]="busy()">{{ busy() ? 'Ajout…' : 'Ajouter' }}</button>
          <button type="button" (click)="open.set(false)" [disabled]="busy()">Annuler</button>
        </div>
      </form>
    }
  `,
  styles: `
    .pool-form { display: flex; flex-direction: column; gap: .35rem; }
    .pool-form textarea, .pool-form input { width: 100%; font: inherit; }
    .small { font-size: .85rem; margin: 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TalentPoolAdd {
  private api = inject(TalentPoolService);

  applicationId = input.required<number>();
  open = signal(false);
  busy = signal(false);
  note = signal('');
  tags = signal('');
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  private noteInput = viewChild<ElementRef<HTMLTextAreaElement>>('noteInput');

  start() {
    this.open.set(true);
    this.message.set(null);
    setTimeout(() => this.noteInput()?.nativeElement.focus());
  }

  save() {
    const tags = this.tags().split(',').map(t => t.trim()).filter(t => !!t);
    this.busy.set(true);
    this.error.set(null);
    this.api.add(this.applicationId(), this.note().trim() || null, tags).subscribe({
      next: r => {
        this.busy.set(false);
        this.open.set(false);
        this.note.set('');
        this.tags.set('');
        this.message.set(r.created ? 'Candidat ajouté au vivier ; il en est informé par e-mail.'
          : 'Ce candidat était déjà dans le vivier : la note et les étiquettes ont été complétées.');
      },
      error: err => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
