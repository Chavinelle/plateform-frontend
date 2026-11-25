import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Tracés des icônes (style trait, 24×24), dessinés pour ce projet. */
const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  briefcase: 'M3 7h18v13H3zM8 7V4h8v3M3 12h18',
  columns: 'M3 4h5v16H3zM10 4h5v10h-5zM17 4h4v13h-4z',
  calendar: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  clipboard: 'M8 4h8v3H8zM6 5H4v16h16V5h-2M8 12h8M8 16h5',
  quiz: 'M4 4h16v16H4zM9 9.5a3 3 0 1 1 3.5 3c-.6.2-.5.8-.5 1.5M12 17h.01',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  building: 'M4 21V4h11v17M15 9h5v12M8 8h3M8 12h3M8 16h3M2 21h20',
  users: 'M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.4M15 4.2a3.5 3.5 0 0 1 0 6.6',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  log: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M21 21l-5-5',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6 6 18',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M4 12.5 9 17.5 20 6.5',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4z',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  chevron: 'M6 9l6 6 6-6',
};

/** Icône décorative (aria-hidden) : le texte du lien voisin porte le sens. */
@Component({
  selector: 'app-nav-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" [attr.width]="size()" [attr.height]="size()" aria-hidden="true" focusable="false"
         fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path [attr.d]="d()" />
    </svg>
  `,
  styles: `:host { display: inline-flex; flex: none; }`,
})
export class NavIcon {
  readonly name = input.required<string>();
  readonly size = input(20);
  protected readonly d = computed(() => PATHS[this.name()] ?? PATHS['list']);
}
