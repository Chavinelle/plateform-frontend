import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** Précision affichée après la valeur (ex. « 2 embauches »). */
  note?: string;
}

/**
 * Barres horizontales (une seule série) : valeur au bout de chaque barre, tableau de données en option.
 * Le titre nomme la série : pas de légende.
 */
@Component({
  selector: 'app-bar-list',
  template: `
    <figure class="viz">
      <figcaption class="viz-head">
        <span class="viz-title">{{ title() }}</span>
        @if (items().length) {
          <button type="button" class="link" (click)="showTable.set(!showTable())" [attr.aria-expanded]="showTable()">
            {{ showTable() ? 'Masquer les données' : 'Voir les données' }}
          </button>
        }
      </figcaption>
      @if (!items().length) {
        <p class="muted empty">{{ empty() }}</p>
      } @else if (showTable()) {
        <table class="table data-table">
          <caption class="sr-only">{{ title() }}</caption>
          <thead><tr><th scope="col">{{ labelHeader() }}</th><th scope="col">{{ valueHeader() }}</th></tr></thead>
          <tbody>
            @for (i of items(); track i.key) {
              <tr><th scope="row">{{ i.label }}</th><td>{{ i.value }}{{ i.note ? ' (' + i.note + ')' : '' }}</td></tr>
            }
          </tbody>
        </table>
      } @else {
        <ul class="bars" aria-hidden="true">
          @for (i of items(); track i.key) {
            <li class="bar-row" [attr.title]="i.label + ' : ' + i.value + (i.note ? ' (' + i.note + ')' : '')">
              <span class="bar-label">{{ i.label }}</span>
              <span class="bar-track">
                <span class="bar" [style.width]="barWidth(i.value)"></span>
                <span class="bar-value">{{ i.value }}@if (i.note) {<span class="note"> · {{ i.note }}</span>}</span>
              </span>
            </li>
          }
        </ul>
        <!-- équivalent textuel pour les lecteurs d'écran -->
        <ul class="sr-only">
          @for (i of items(); track i.key) { <li>{{ i.label }} : {{ i.value }}{{ i.note ? ', ' + i.note : '' }}</li> }
        </ul>
      }
    </figure>
  `,
  styleUrl: '../charts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarList {
  title = input.required<string>();
  items = input.required<BarItem[]>();
  labelHeader = input('Libellé');
  valueHeader = input('Nombre');
  empty = input('Aucune donnée sur la période.');

  showTable = signal(false);
  private max = computed(() => Math.max(1, ...this.items().map(i => i.value)));

  /** Largeur CSS : proportion de la piste, moins la place réservée à la valeur (la plus longue barre ne déborde pas). */
  barWidth(value: number): string {
    return `calc((100% - 7rem) * ${this.width(value) / 100})`;
  }

  /** Largeur en % ; une valeur non nulle garde une barre visible. */
  width(value: number): number {
    return value === 0 ? 0 : Math.max(2, (value / this.max()) * 100);
  }
}
