import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SavedJobItem } from '../models/application.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${environment.apiUrl}/candidate`;

  private saved = signal<ReadonlySet<number>>(new Set());
  private applied = signal<ReadonlySet<number>>(new Set());

  /** Les favoris n'existent que pour les candidats. */
  readonly enabled = computed(() => this.auth.user()?.role === 'CANDIDAT');

  constructor() {
    effect(() => {
      if (this.enabled()) {
        untracked(() => this.refresh());
      } else {
        this.saved.set(new Set());           // déconnexion ou autre type de compte : on vide
        this.applied.set(new Set());
      }
    });
  }

  isSaved(jobId: number): boolean {
    return this.saved().has(jobId);
  }

  hasApplied(jobId: number): boolean {
    return this.applied().has(jobId);
  }

  refresh() {
    this.http.get<number[]>(`${this.base}/saved-jobs/ids`)
      .subscribe({ next: ids => this.saved.set(new Set(ids)), error: () => { /* on garde l'état courant */ } });
    this.http.get<number[]>(`${this.base}/applied-jobs/ids`)
      .subscribe({ next: ids => this.applied.set(new Set(ids)), error: () => { /* idem */ } });
  }

  list() {
    return this.http.get<SavedJobItem[]>(`${this.base}/saved-jobs`);
  }

  /** Clic sur le cœur : l'affichage change tout de suite, et revient en arrière si le serveur refuse. */
  toggle(jobId: number) {
    const wasSaved = this.isSaved(jobId);
    this.setSaved(jobId, !wasSaved);
    const request$ = wasSaved
      ? this.http.delete<void>(`${this.base}/saved-jobs/${jobId}`)
      : this.http.put<void>(`${this.base}/saved-jobs/${jobId}`, {});
    request$.subscribe({ error: () => this.setSaved(jobId, wasSaved) });
  }

  remove(jobId: number) {
    return this.http.delete<void>(`${this.base}/saved-jobs/${jobId}`)
      .pipe(tap(() => this.setSaved(jobId, false)));
  }

  markApplied(jobId: number) {
    this.applied.update(s => new Set(s).add(jobId));
  }

  private setSaved(jobId: number, saved: boolean) {
    this.saved.update(s => {
      const copy = new Set(s);
      if (saved) copy.add(jobId); else copy.delete(jobId);
      return copy;
    });
  }
}
