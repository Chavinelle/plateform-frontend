import { Component, inject, input, linkedSignal, signal } from '@angular/core';
import { ProfileVisibility, VISIBILITY_OPTIONS } from './../../../../../core/models/candidate.models';
import { CandidateService } from './../../../../../core/services/candidate.service';
import { extractErrorMessage } from './../../../../../core/utils/http-error';

@Component({
  selector: 'app-visibility-card',
  imports: [],
  templateUrl: './visibility-card.html',
  styleUrl: './visibility-card.scss',
})
export class VisibilityCard {
  private api = inject(CandidateService);

  initial = input.required<ProfileVisibility>({ alias: 'visibility' });
  current = linkedSignal(() => this.initial());

  options = VISIBILITY_OPTIONS;
  saving = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  choose(value: ProfileVisibility) {
    const previous = this.current();
    if (value === previous) return;

    this.current.set(value);
    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);

    this.api.updateVisibility(value).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set('Visibilité mise à jour.');
      },
      error: err => {
        this.saving.set(false);
        this.current.set(previous);          // on revient à l'ancien choix si le serveur refuse
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
