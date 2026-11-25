import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationPreference, NotificationType } from '../../../../core/models/notification.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { Loading } from '../../../shared/loading/loading';

/** Préférences de notification : dans l'application et par e-mail, pour chaque type d'événement. */
@Component({
  selector: 'app-notification-preferences',
  imports: [Loading, RouterLink],
  templateUrl: './notification-preferences.html',
  styleUrl: './notification-preferences.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationPreferences {
  private api = inject(NotificationService);

  prefs = signal<NotificationPreference[]>([]);
  private initial = signal<string>('');
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  message = signal<string | null>(null);

  dirty = computed(() => JSON.stringify(this.prefs()) !== this.initial());

  constructor() {
    this.api.preferences().subscribe({
      next: list => this.reset(list),
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  toggle(type: NotificationType, channel: 'inApp' | 'email', checked: boolean) {
    this.message.set(null);
    this.prefs.update(list => list.map(p => (p.type === type ? { ...p, [channel]: checked } : p)));
  }

  save() {
    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    this.api.savePreferences(this.prefs().map(p => ({ type: p.type, inApp: p.inApp, email: p.email }))).subscribe({
      next: list => {
        this.saving.set(false);
        this.reset(list);
        this.message.set('Préférences enregistrées.');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  private reset(list: NotificationPreference[]) {
    this.loading.set(false);
    this.prefs.set(list);
    this.initial.set(JSON.stringify(list));
  }
}
