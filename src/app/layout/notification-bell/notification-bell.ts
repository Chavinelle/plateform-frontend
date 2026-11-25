import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, filter, merge, switchMap, timer } from 'rxjs';
import { AppNotification, NOTIFICATION_POLL_MS } from '../../../core/models/notification.models';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/http-error';

/**
 * Cloche de notifications : compteur des non-lues (mis à jour toutes les minutes et à chaque navigation)
 * et panneau des dernières notifications. Motif « disclosure » : bouton + panneau, Échap pour fermer.
 */
@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe, RouterLink],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close(true)'
  }
})
export class NotificationBell {
  private api = inject(NotificationService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  readonly unread = this.api.unread;
  open = signal(false);
  items = signal<AppNotification[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  announce = signal('');

  badge = computed(() => (this.unread() > 99 ? '99+' : String(this.unread())));
  buttonLabel = computed(() => {
    const n = this.unread();
    return n === 0 ? 'Notifications, aucune non lue' : `Notifications, ${n} non lue${n > 1 ? 's' : ''}`;
  });

  private button = viewChild<ElementRef<HTMLButtonElement>>('bellButton');
  private previous = -1;

  constructor() {
    merge(timer(0, NOTIFICATION_POLL_MS), this.router.events.pipe(filter(e => e instanceof NavigationEnd))).pipe(
      switchMap(() => this.api.refreshCount().pipe(catchError(() => EMPTY))),
      takeUntilDestroyed()
    ).subscribe();

    // annonce discrète d'une nouvelle notification (pas au premier chargement)
    effect(() => {
      const n = this.unread();
      if (this.previous >= 0 && n > this.previous) {
        this.announce.set(n - this.previous > 1 ? `${n - this.previous} nouvelles notifications` : 'Nouvelle notification');
      }
      this.previous = n;
    });
  }

  toggle() {
    if (this.open()) {
      this.close(false);
      return;
    }
    this.open.set(true);
    this.load();
  }

  close(returnFocus: boolean) {
    if (!this.open()) return;
    this.open.set(false);
    if (returnFocus) this.button()?.nativeElement.focus();
  }

  /** Clic en dehors de la cloche : le panneau se ferme. */
  onDocumentClick(event: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close(false);
  }

  /** Ouvrir une notification la marque comme lue. */
  select(n: AppNotification) {
    this.close(false);
    if (!n.read) {
      this.api.markRead(n).subscribe({ error: () => undefined });
      this.items.update(list => list.map(x => (x.id === n.id ? { ...x, read: true } : x)));
    }
  }

  markAllRead() {
    this.api.markAllRead().subscribe({
      next: () => {
        this.items.update(list => list.map(x => ({ ...x, read: true })));
        this.announce.set('Toutes les notifications sont marquées comme lues.');
      },
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  private load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(0, 8).subscribe({
      next: page => {
        this.loading.set(false);
        this.items.set(page.content);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
