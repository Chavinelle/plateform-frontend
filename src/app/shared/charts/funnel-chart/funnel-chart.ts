import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  /** Part de la première étape, en %. */
  rate: number | null;
  /** Passage depuis l'étape précédente, en %. */
  fromPrevious: number | null;
}

/**
 * Entonnoir en barres horizontales décroissantes (une seule série) : effectif et part du total au bout
 * de chaque barre, taux de passage écrit entre deux étapes, tableau de données en option.
 */
@Component({
  selector: 'app-funnel-chart',
  imports: [DecimalPipe],
  template: `
    <figure class="viz">
      <figcaption class="viz-head">
        <span class="viz-title">{{ title() }}</span>
        @if (hasData()) {
          <button type="button" class="link" (click)="showTable.set(!showTable())" [attr.aria-expanded]="showTable()">
            {{ showTable() ? 'Masquer les données' : 'Voir les données' }}
          </button>
        }
      </figcaption>

      @if (!hasData()) {
        <p class="muted empty">Aucune candidature sur la période.</p>
      } @else if (showTable()) {
        <table class="table data-table">
          <caption class="sr-only">{{ title() }}</caption>
          <thead>
            <tr><th scope="col">Étape</th><th scope="col">Candidatures</th><th scope="col">Part du total</th><th scope="col">Passage depuis l'étape précédente</th></tr>
          </thead>
          <tbody>
            @for (s of steps(); track s.key; let first = $first) {
              <tr>
                <th scope="row">{{ s.label }}</th>
                <td>{{ s.count }}</td>
                <td>{{ s.rate === null ? '—' : (s.rate | number: '1.0-1') + ' %' }}</td>
                <td>{{ first || s.fromPrevious === null ? '—' : (s.fromPrevious | number: '1.0-1') + ' %' }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <ol class="funnel">
          @for (s of steps(); track s.key; let first = $first) {
            @if (!first) {
              <li class="passage" aria-hidden="true">
                ↓ {{ s.fromPrevious === null ? '—' : (s.fromPrevious | number: '1.0-0') + ' %' }} passent à l'étape suivante
              </li>
            }
            <li class="funnel-row">
              <span class="bar-label">{{ s.label }}</span>
              <span class="bar-track">
                <span class="bar" [style.width.%]="width(s.count)"></span>
                <span class="bar-value">
                  {{ s.count }}
                  @if (!first && s.rate !== null) { <span class="note"> · {{ s.rate | number: '1.0-0' }} % du total</span> }
                </span>
              </span>
              <span class="sr-only">
                : {{ s.count }} candidature{{ s.count > 1 ? 's' : '' }}
                @if (!first && s.rate !== null) { , soit {{ s.rate | number: '1.0-1' }} % du total }
                @if (!first && s.fromPrevious !== null) { , {{ s.fromPrevious | number: '1.0-1' }} % de l'étape précédente }
              </span>
            </li>
          }
        </ol>
      }
    </figure>
  `,
  styleUrl: '../charts.scss',
  styles: `
    .funnel { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    .funnel-row { display: grid; grid-template-columns: minmax(7rem, 30%) 1fr; gap: .6rem; align-items: center; min-height: 1.9rem; }
    .funnel .bar { height: 20px; }
    .passage { padding-left: calc(min(30%, 100%) + .6rem); font-size: .8rem; color: var(--viz-text-secondary); }
    @media (max-width: 600px) { .passage { padding-left: 0; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FunnelChart {
  title = input.required<string>();
  steps = input.required<FunnelStep[]>();

  showTable = signal(false);
  hasData = computed(() => (this.steps()[0]?.count ?? 0) > 0);
  private first = computed(() => Math.max(1, this.steps()[0]?.count ?? 1));

  width(count: number): number {
    return count === 0 ? 0 : Math.max(2, (count / this.first()) * 100);
  }
}
