import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { ROLE_LABELS } from '../../../core/models/admin.models';
import { AuthService } from '../../../core/services/auth.service';
import { LayoutService } from '../../../core/services/layout.service';
import { NavIcon } from '../nav-icon/nav-icon';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

interface NavLink { label: string; path: string; icon: string; exact?: boolean; }
interface NavGroup { title: string | null; links: NavLink[]; }

/**
 * Barre latérale des espaces entreprise et super administrateur (D2) : liens regroupés par thème,
 * utilisateur, thème et déconnexion en bas. Toujours visible sur grand écran ; panneau superposé
 * sur petit écran (ouvert par le bouton « Menu » de la barre du haut, fermé par Échap, le fond ou un lien).
 */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, NavIcon, ThemeToggle],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeOnEscape()' },
})
export class Sidebar {
  private auth = inject(AuthService);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private document = inject(DOCUMENT);
  private injector = inject(Injector);
  protected layout = inject(LayoutService);

  readonly user = this.auth.user;
  readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    return role ? ROLE_LABELS[role] ?? role : '';
  });
  readonly initials = computed(() => {
    const u = this.user();
    return u ? `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() : '';
  });

  readonly groups = computed<NavGroup[]>(() => {
    const role = this.user()?.role;
    if (role === 'SUPER_ADMIN') {
      return [
        { title: 'Administration', links: [
          { label: 'Entreprises', path: '/admin/entreprises', icon: 'building' },
          { label: 'Comptes', path: '/admin/utilisateurs', icon: 'users' },
          { label: 'Signalements', path: '/admin/signalements', icon: 'flag' },
          { label: 'Référentiels', path: '/admin/referentiels', icon: 'list' },
          { label: 'Journal d’audit', path: '/admin/journal', icon: 'log' },
        ] },
        { title: 'Plateforme', links: [
          { label: 'Offres publiées', path: '/offres', icon: 'search' },
        ] },
      ];
    }
    const company: NavLink[] = [
      { label: 'Mon entreprise', path: '/recruteur/entreprise', icon: 'building' },
      { label: 'Équipe', path: '/recruteur/equipe', icon: 'users' },
    ];
    if (role !== 'MANAGER') company.push({ label: 'Modèles d’e-mails', path: '/recruteur/emails', icon: 'mail' });
    return [
      { title: null, links: [
        { label: 'Accueil', path: '/recruteur', icon: 'home', exact: true },
        { label: 'Tableau de bord', path: '/recruteur/tableau-de-bord', icon: 'chart' },
      ] },
      { title: 'Recrutement', links: [
        { label: 'Offres', path: '/recruteur/offres', icon: 'briefcase' },
        { label: 'Pipeline', path: '/recruteur/pipeline', icon: 'columns' },
        { label: 'Agenda', path: '/recruteur/agenda', icon: 'calendar' },
      ] },
      { title: 'Évaluation', links: [
        { label: 'Grilles', path: '/recruteur/grilles', icon: 'clipboard' },
        { label: 'Tests en ligne', path: '/recruteur/tests', icon: 'quiz' },
      ] },
      { title: 'Talents', links: [
        { label: 'Vivier', path: '/recruteur/vivier', icon: 'star' },
      ] },
      { title: 'Entreprise', links: company },
    ];
  });

  constructor() {
    // un lien choisi : le panneau (petit écran) se referme
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.layout.closeSidebar());
    // à l'ouverture sur petit écran, le focus va au premier lien du panneau
    effect(() => {
      if (this.layout.sidebarOpen()) {
        afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('nav a')?.focus(),
          { injector: this.injector });
      }
    });
  }

  /** Échap ferme le panneau et rend le focus au bouton « Menu ». */
  closeOnEscape() {
    if (!this.layout.sidebarOpen()) return;
    this.layout.closeSidebar();
    this.document.getElementById('sidebar-toggle')?.focus();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
