import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { Footer } from './layout/footer/footer';
import { Navbar } from './layout/navbar/navbar';
import { Sidebar } from './layout/sidebar/sidebar';
import { Topbar } from './layout/topbar/topbar';

const SIDEBAR_ROLES = ['ADMIN_ENTREPRISE', 'RECRUTEUR', 'MANAGER', 'SUPER_ADMIN'];

/**
 * Coquille de l'application : deux mises en page selon le rôle connecté.
 * Entreprise et super administrateur : barre latérale + barre du haut. Visiteurs et candidats : barre de navigation en haut.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, Sidebar, Topbar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private auth = inject(AuthService);
  readonly withSidebar = computed(() => SIDEBAR_ROLES.includes(this.auth.user()?.role ?? ''));
  readonly loggedIn = computed(() => !!this.auth.user());
}
