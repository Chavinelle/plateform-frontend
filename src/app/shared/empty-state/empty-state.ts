import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NavIcon } from '../../layout/nav-icon/nav-icon';

/**
 * État vide : icône, titre, explication et action suggérée (contenu projeté : paragraphe, liens, boutons).
 * Exemple : <app-empty-state icon="briefcase" heading="Aucune offre"><p>…</p><a class="button-link primary">…</a></app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  imports: [NavIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.compact]': 'compact()' },
  template: `
    <span class="icon" aria-hidden="true"><app-nav-icon [name]="icon()" [size]="compact() ? 20 : 26" /></span>
    <p class="title">{{ heading() }}</p>
    <div class="body"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: .35rem;
      padding: 2.75rem 1.5rem; border: 1px dashed var(--border-strong); border-radius: var(--radius-lg); background: var(--surface);
    }
    :host(.compact) { padding: 1.5rem 1rem; background: transparent; }
    .icon {
      display: grid; place-items: center; width: 56px; height: 56px; margin-bottom: .5rem; border-radius: 16px;
      background: var(--primary-soft); color: var(--primary);
    }
    :host(.compact) .icon { width: 40px; height: 40px; border-radius: 12px; margin-bottom: .25rem; }
    .title { margin: 0; font-weight: 650; font-size: 1.02rem; color: var(--text); }
    .body { color: var(--text-muted); font-size: .92rem; max-width: 46ch; }
  `,
})
export class EmptyState {
  readonly icon = input('list');
  readonly heading = input.required<string>();
  /** Version discrète, pour un panneau ou une section de page. */
  readonly compact = input(false);
}
