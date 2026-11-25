import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { PageResponse } from '../../../core/models/company.models';
import { AppNotification } from '../../../core/models/notification.models';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/http-error';
import { Loading } from '../../shared/loading/loading';
import { EmptyState } from '../../shared/empty-state/empty-state';

const PAGE_SIZE = 20;

/** Historique complet des notifications de l'utilisateur connecté. */
@Component({
  selector: 'app-notifications-page',
  imports: [EmptyState, Loading, DatePipe, RouterLink],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsPage {
  private api = inject(NotificationService);

  readonly unread = this.api.unread;
  unreadOnly = signal(false);
  page = signal(0);
  result = signal<PageResponse<AppNotification> | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  private tick = signal(0);

  constructor() {
    toObservable(computed(() => ({ unreadOnly: this.unreadOnly(), page: this.page(), tick: this.tick() }))).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(q => this.api.list(q.page, PAGE_SIZE, q.unreadOnly).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(res => {
      this.loading.set(false);
      if (res) this.result.set(res);
    });
  }

  setUnreadOnly(value: boolean) {
    this.unreadOnly.set(value);
    this.page.set(0);
  }

  goTo(page: number) {
    this.page.set(Math.max(0, page));
  }

  open(n: AppNotification) {
    if (n.read) return;
    this.api.markRead(n).subscribe({ error: () => undefined });
    this.patch(n.id);
  }

  markRead(n: AppNotification) {
    this.api.markRead(n).subscribe({
      next: () => {
        this.patch(n.id);
        this.message.set('Notification marquée comme lue.');
      },
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  markAllRead() {
    this.api.markAllRead().subscribe({
      next: () => {
        this.message.set('Toutes les notifications sont marquées comme lues.');
        this.tick.update(t => t + 1);
      },
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  private patch(id: number) {
    this.result.update(r => r && { ...r, content: r.content.map(x => (x.id === id ? { ...x, read: true } : x)) });
  }
}
