import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { AdminUserItem, ROLE_LABELS, USER_STATUS_LABELS, UserStatus } from '../../../../core/models/admin.models';
import { PageResponse } from '../../../../core/models/company.models';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';

/** Comptes de la plateforme : recherche, filtres, suspension, réactivation, fermeture, effacement des données (11.8). */
type UserAction = UserStatus | 'ERASE';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-users.html',
  styleUrl: '../admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsers {
  private api = inject(AdminService);
  private auth = inject(AuthService);

  readonly roleLabels = ROLE_LABELS;
  readonly roles = Object.keys(ROLE_LABELS);
  readonly statusLabels = USER_STATUS_LABELS;
  readonly statuses = Object.keys(USER_STATUS_LABELS) as UserStatus[];
  myEmail = computed(() => this.auth.user()?.email ?? null);

  q = signal('');
  role = signal<string | null>(null);
  status = signal<UserStatus | null>(null);
  page = signal(0);
  result = signal<PageResponse<AdminUserItem> | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  message = signal<string | null>(null);

  /** Action en cours de confirmation sur une ligne. */
  pending = signal<{ id: number; to: UserAction } | null>(null);
  reason = signal('');
  busy = signal(false);
  private tick = signal(0);

  constructor() {
    toObservable(computed(() => ({ q: this.q().trim(), role: this.role(), status: this.status(), page: this.page(), t: this.tick() }))).pipe(
      debounceTime(250),
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(query => this.api.users(query).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(r => {
      this.loading.set(false);
      if (r) this.result.set(r);
    });
  }

  setQuery(v: string) { this.q.set(v); this.page.set(0); }
  setRole(v: string) { this.role.set(v || null); this.page.set(0); }
  setStatus(v: string) { this.status.set((v || null) as UserStatus | null); this.page.set(0); }

  /** Actions possibles selon le statut actuel. */
  actionsFor(u: AdminUserItem): { to: UserAction; label: string }[] {
    if (u.erasedAt) return [];
    const actions: { to: UserAction; label: string }[] = u.status === 'ACTIF'
      ? [{ to: 'SUSPENDU', label: 'Suspendre' }, { to: 'DESACTIVE', label: 'Fermer le compte' }]
      : [{ to: 'ACTIF', label: 'Réactiver' }];
    // droit à l'effacement : comptes candidats uniquement (un membre d'entreprise est désactivé par son entreprise)
    if (u.role === 'CANDIDAT') actions.push({ to: 'ERASE', label: 'Effacer les données' });
    return actions;
  }

  ask(u: AdminUserItem, to: UserAction) {
    this.pending.set({ id: u.id, to });
    this.reason.set('');
    this.message.set(null);
    this.error.set(null);
  }

  confirm(u: AdminUserItem) {
    const p = this.pending();
    if (!p) return;
    const reason = this.reason().trim();
    if (p.to === 'ERASE' && !reason) {
      this.error.set('Indiquez la référence de la demande (date, canal) : elle est inscrite au journal d’audit.');
      return;
    }
    const call = p.to === 'ERASE' ? this.api.eraseUser(u.id, reason) : this.api.changeUserStatus(u.id, p.to, reason || null);
    this.busy.set(true);
    this.error.set(null);
    call.subscribe({
      next: r => {
        this.busy.set(false);
        this.pending.set(null);
        this.result.update(res => res && { ...res, content: res.content.map(x => (x.id === r.id ? r : x)) });
        this.message.set(p.to === 'ERASE'
          ? `Les données du compte n° ${r.id} ont été effacées. Un dernier e-mail de confirmation est parti à l’ancienne adresse.`
          : `${r.firstName} ${r.lastName} : ${USER_STATUS_LABELS[r.status].toLowerCase()}. Un e-mail l’en informe.`);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
