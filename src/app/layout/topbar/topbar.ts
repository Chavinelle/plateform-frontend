import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LayoutService } from '../../../core/services/layout.service';
import { NavIcon } from '../nav-icon/nav-icon';
import { NotificationBell } from '../notification-bell/notification-bell';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

/**
 * Barre du haut des espaces avec barre latérale (D2) : bouton « Menu » et logo sur petit écran,
 * cloche des notifications et thème à droite.
 */
@Component({
  selector: 'app-topbar',
  imports: [RouterLink, NavIcon, NotificationBell, ThemeToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <button type="button" id="sidebar-toggle" class="menu-toggle" aria-controls="app-sidebar" aria-label="Menu"
              [attr.aria-expanded]="layout.sidebarOpen()" (click)="layout.toggleSidebar()">
        <app-nav-icon [name]="layout.sidebarOpen() ? 'close' : 'menu'" />
        <span>Menu</span>
      </button>
      <a routerLink="/" class="brand" aria-label="Recrutement, accueil du site">
        <span class="brand-mark" aria-hidden="true">R</span>
      </a>
      <span class="space">{{ spaceLabel() }}</span>
      <div class="end">
        <app-theme-toggle />
        @if (showBell()) { <app-notification-bell /> }
      </div>
    </header>
  `,
  styles: `
    :host { position: sticky; top: 0; z-index: 20; display: block; }
    .topbar {
      display: flex; align-items: center; gap: .75rem; min-height: 64px; padding: .5rem 2rem;
      background: color-mix(in srgb, var(--surface) 92%, transparent); backdrop-filter: saturate(160%) blur(8px);
      border-bottom: 1px solid var(--border);
    }
    .space { display: inline-flex; align-items: center; gap: .5rem; font-size: .9rem; font-weight: 600; color: var(--text); }
    .space::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--success-solid); }
    .end { margin-left: auto; display: flex; align-items: center; gap: .35rem; }
    .menu-toggle, .brand { display: none; }
    @media (max-width: 1023.98px) {
      .topbar { padding: .5rem 1rem; }
      .menu-toggle { display: inline-flex; min-height: 44px; }
      .brand { display: inline-flex; text-decoration: none; }
    }
    @media (max-width: 479.98px) {
      .space { display: none; }
      .menu-toggle span { display: none; }
      .menu-toggle { width: 44px; padding: 0; }
    }
  `,
})
export class Topbar {
  private auth = inject(AuthService);
  protected layout = inject(LayoutService);

  readonly spaceLabel = computed(() => this.auth.user()?.role === 'SUPER_ADMIN' ? 'Administration de la plateforme' : 'Espace entreprise');
  readonly showBell = computed(() => this.auth.user()?.role !== 'SUPER_ADMIN');
}
