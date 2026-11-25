import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageResponse } from '../models/company.models';
import { AppNotification, NotificationPreference, NotificationType } from '../models/notification.models';

/** Notifications de l'utilisateur connecté ; le compteur des non-lues est partagé (cloche, page). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/notifications`;

  private _unread = signal(0);
  readonly unread = this._unread.asReadonly();

  list(page = 0, size = 20, unreadOnly = false) {
    const params = new HttpParams().set('page', page).set('size', size).set('unreadOnly', unreadOnly);
    return this.http.get<PageResponse<AppNotification>>(this.base, { params });
  }

  refreshCount() {
    return this.http.get<{ count: number }>(`${this.base}/unread-count`).pipe(tap(r => this._unread.set(r.count)));
  }

  markRead(n: AppNotification) {
    return this.http.post<AppNotification>(`${this.base}/${n.id}/read`, {}).pipe(tap(() => {
      if (!n.read) this._unread.update(c => Math.max(0, c - 1));
    }));
  }

  preferences() {
    return this.http.get<NotificationPreference[]>(`${this.base}/preferences`);
  }

  savePreferences(preferences: { type: NotificationType; inApp: boolean; email: boolean }[]) {
    return this.http.put<NotificationPreference[]>(`${this.base}/preferences`, { preferences });
  }

  markAllRead() {
    return this.http.post<{ updated: number }>(`${this.base}/read-all`, {}).pipe(tap(() => this._unread.set(0)));
  }
}
