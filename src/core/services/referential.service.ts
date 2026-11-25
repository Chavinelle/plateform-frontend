import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { ReferentialKind, ReferentialView } from '../models/referential.models';

/** Référentiels : suggestions (chargées une fois par session) et gestion par le super administrateur. */
@Injectable({ providedIn: 'root' })
export class ReferentialService {
  private http = inject(HttpClient);
  private cache = new Map<ReferentialKind, ReturnType<typeof signal<string[]>>>();

  /** Libellés actifs du référentiel, pour un {@code <datalist>} ; liste vide si le chargement échoue. */
  labels(kind: ReferentialKind): Signal<string[]> {
    let s = this.cache.get(kind);
    if (!s) {
      s = signal<string[]>([]);
      this.cache.set(kind, s);
      const target = s;
      this.http.get<string[]>(`${environment.apiUrl}/public/referentials/${kind}`)
        .subscribe({ next: list => target.set(list), error: () => undefined });
    }
    return s.asReadonly();
  }

  /** Après une modification par l'administrateur : les suggestions seront rechargées. */
  invalidate(kind: ReferentialKind) {
    this.cache.delete(kind);
  }

  // ---- gestion (super administrateur) ----
  private admin(kind: ReferentialKind) {
    return `${environment.apiUrl}/admin/referentials/${kind}`;
  }
  view(kind: ReferentialKind) {
    return this.http.get<ReferentialView>(this.admin(kind));
  }
  create(kind: ReferentialKind, label: string) {
    return this.http.post<ReferentialView>(this.admin(kind), { label });
  }
  rename(kind: ReferentialKind, id: number, label: string) {
    return this.http.put<ReferentialView>(`${this.admin(kind)}/${id}`, { label });
  }
  setArchived(kind: ReferentialKind, id: number, archived: boolean) {
    return this.http.post<ReferentialView>(`${this.admin(kind)}/${id}/${archived ? 'archive' : 'restore'}`, {});
  }
  merge(kind: ReferentialKind, value: string, targetId: number) {
    return this.http.post<ReferentialView>(`${this.admin(kind)}/merge`, { value, targetId });
  }
}
