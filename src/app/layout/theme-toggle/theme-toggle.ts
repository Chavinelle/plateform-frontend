import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';

/** Bouton du thème : automatique → clair → sombre. Le nom accessible annonce le thème actuel et le suivant. */
@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="icon theme-toggle" [class.block]="block()" (click)="theme.cycle()"
            [attr.aria-label]="'Thème ' + theme.label() + '. Passer au thème ' + theme.nextLabel()"
            [title]="'Thème ' + theme.label() + ' (cliquer : ' + theme.nextLabel() + ')'">
      @switch (theme.choice()) {
        @case ('light') {
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" />
          </svg>
        }
        @case ('dark') {
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
            <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
          </svg>
        }
        @default {
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17A8.5 8.5 0 0 0 12 3.5Z" fill="currentColor" />
          </svg>
        }
      }
      @if (showLabel()) { <span class="theme-label">Thème {{ theme.label() }}</span> }
    </button>
  `,
  styles: `
    :host { display: inline-flex; }
    .theme-toggle { min-width: 40px; height: 40px; border-radius: 10px; gap: .55rem; }
    .theme-label { font-size: .88rem; font-weight: 500; }
    .theme-toggle.block { width: 100%; justify-content: flex-start; padding: 0 .65rem; color: var(--text-muted); }
  `,
})
export class ThemeToggle {
  theme = inject(ThemeService);
  /** Affiche aussi le libellé (barre latérale). */
  readonly showLabel = input(false);
  /** Occupe toute la largeur (barre latérale). */
  readonly block = input(false);
}
