import { Injectable, inject, signal } from '@angular/core';
import { CompletionResult } from '../models/candidate.models';
import { CandidateService } from './candidate.service';

@Injectable({ providedIn: 'root' })
export class ProfileCompletionService {
  private api = inject(CandidateService);
  private _data = signal<CompletionResult | null>(null);
  readonly data = this._data.asReadonly();

  refresh() {
    this.api.getCompletion().subscribe({
      next: result => this._data.set(result),
      error: () => { /* la barre garde sa dernière valeur */ }
    });
  }
}
