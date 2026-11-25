import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { homeRouteFor } from '../../../core/utils/roles';
import { FavoritesService } from '../../../core/services/favorites.service';
import { NotificationBell } from '../notification-bell/notification-bell';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, NotificationBell, ThemeToggle],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'closeMenu(true)' },
})
export class Navbar {
  auth = inject(AuthService);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  // créé dès le démarrage : charge les favoris du candidat à la connexion (cœurs des offres à jour)
  private favorites = inject(FavoritesService);

  /** Menu déplié (petit écran uniquement : au-delà de 900 px, les liens sont toujours visibles). */
  menuOpen = signal(false);

  isCompany = computed(() => ['ADMIN_ENTREPRISE', 'RECRUTEUR', 'MANAGER'].includes(this.auth.user()?.role ?? ''));

  initials = computed(() => {
    const u = this.auth.user();
    return u ? `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() : '';
  });

  space = computed(() => {
    const user = this.auth.user();
    return user ? homeRouteFor(user.role) : '/';
  });

  constructor() {
    // un lien choisi : le menu se replie
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuOpen.set(false));
  }

  toggleMenu() {
    this.menuOpen.update(open => !open);
  }

  /** Échap : replie le menu et rend le focus au bouton, pour ne pas perdre l'utilisateur au clavier. */
  closeMenu(restoreFocus = false) {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (restoreFocus) this.host.nativeElement.querySelector<HTMLButtonElement>('.menu-toggle')?.focus();
  }

  logout() {
    this.menuOpen.set(false);
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
