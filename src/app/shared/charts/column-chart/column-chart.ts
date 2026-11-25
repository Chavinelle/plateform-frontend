import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';

export interface ColumnItem {
  /** Étiquette courte sous l'axe (ex. « 4 mars »). */
  label: string;
  /** Étiquette complète (infobulle, tableau), ex. « semaine du 4 mars 2025 ». */
  fullLabel: string;
  value: number;
}

/** Largeur de départ (avant la première mesure) ; ensuite, la largeur réelle du conteneur : le texte garde sa taille. */
const W = 640;
const H = 240;
const PAD = { top: 16, right: 8, bottom: 28, left: 32 };

/**
 * Colonnes dans le temps (une seule série), en SVG : axe des valeurs discret, infobulle au survol,
 * tableau de données en option. Colonnes de 24 px au plus, extrémité arrondie, base carrée.
 */
@Component({
  selector: 'app-column-chart',
  template: `
    <figure class="viz">
      <figcaption class="viz-head">
        <span class="viz-title">{{ title() }}</span>
        <button type="button" class="link" (click)="showTable.set(!showTable())" [attr.aria-expanded]="showTable()">
          {{ showTable() ? 'Masquer les données' : 'Voir les données' }}
        </button>
      </figcaption>

      @if (showTable()) {
        <div class="table-scroll" tabindex="0" role="region" [attr.aria-label]="'Données : ' + title()">
          <table class="table data-table">
            <caption class="sr-only">{{ title() }}</caption>
            <thead><tr><th scope="col">Période</th><th scope="col">{{ valueHeader() }}</th></tr></thead>
            <tbody>
              @for (c of items(); track c.fullLabel) { <tr><th scope="row">{{ c.fullLabel }}</th><td>{{ c.value }}</td></tr> }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="plot" (mouseleave)="hover.set(null)">
          <svg [attr.viewBox]="'0 0 ' + w() + ' ' + h" role="img" [attr.aria-label]="summary()">
            @for (t of ticks(); track t) {
              <line class="grid" [attr.x1]="pad.left" [attr.x2]="w() - pad.right" [attr.y1]="y(t)" [attr.y2]="y(t)" />
              <text class="tick" [attr.x]="pad.left - 6" [attr.y]="y(t) + 4" text-anchor="end">{{ t }}</text>
            }
            @for (c of items(); track c.fullLabel; let i = $index) {
              <!-- zone de survol plus large que la colonne -->
              <rect class="hit" [attr.x]="slotX(i)" [attr.y]="pad.top" [attr.width]="slot()" [attr.height]="plotH"
                    (mouseenter)="hover.set(i)" />
              @if (c.value > 0) {
                <path class="col" [class.active]="hover() === i" [attr.d]="column(i, c.value)" />
              }
              @if (showLabel(i)) {
                <text class="tick" [attr.x]="slotX(i) + slot() / 2" [attr.y]="h - 8" text-anchor="middle">{{ c.label }}</text>
              }
            }
            <line class="axis" [attr.x1]="pad.left" [attr.x2]="w() - pad.right" [attr.y1]="y(0)" [attr.y2]="y(0)" />
          </svg>
          @if (hover() !== null) {
            @let i = hover()!;
            <div class="tooltip" [style.left.%]="tooltipLeft(i)" role="presentation">
              <strong>{{ items()[i].value }}</strong> {{ valueHeader().toLowerCase() }}<br />
              <span>{{ items()[i].fullLabel }}</span>
            </div>
          }
        </div>
      }
    </figure>
  `,
  styleUrl: '../charts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColumnChart {
  title = input.required<string>();
  items = input.required<ColumnItem[]>();
  valueHeader = input('Candidatures');

  readonly w = signal(W);
  readonly h = H;
  readonly pad = PAD;
  readonly plotH = H - PAD.top - PAD.bottom;
  showTable = signal(false);
  hover = signal<number | null>(null);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new ResizeObserver(([entry]) => {
        const width = Math.round(entry.contentRect.width);
        if (width > 0) this.w.set(Math.max(240, width));
      });
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Graduation « ronde » : 0, la moitié et le maximum arrondi. */
  private top = computed(() => {
    const max = Math.max(...this.items().map(c => c.value), 0);
    if (max <= 4) return 4;
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    const nice = [1, 2, 2.5, 5, 10].map(m => m * step).find(v => v >= max / 2) ?? step * 10;
    return nice * 2;
  });
  ticks = computed(() => [0, this.top() / 2, this.top()]);
  slot = computed(() => (this.w() - PAD.left - PAD.right) / Math.max(1, this.items().length));
  // une étiquette tous les 80 px environ, 8 au plus
  private labelEvery = computed(() => Math.ceil(this.items().length / Math.max(2, Math.min(8, Math.floor(this.w() / 80)))));
  summary = computed(() => {
    const total = this.items().reduce((s, c) => s + c.value, 0);
    const best = this.items().reduce((b, c) => (c.value > b.value ? c : b), this.items()[0] ?? { value: 0, fullLabel: '' });
    return `${this.title()} : ${total} au total` + (best && best.value > 0 ? `, maximum ${best.value} (${best.fullLabel})` : '')
      + '. Le détail est disponible avec « Voir les données ».';
  });

  y(v: number): number {
    return PAD.top + this.plotH - (v / this.top()) * this.plotH;
  }

  slotX(i: number): number {
    return PAD.left + i * this.slot();
  }

  showLabel(i: number): boolean {
    return i % this.labelEvery() === 0;
  }

  /** Colonne : base carrée sur l'axe, extrémité arrondie (4 px), 24 px de large au plus, 2 px d'air minimum. */
  column(i: number, value: number): string {
    const width = Math.min(24, Math.max(2, this.slot() - 2));
    const x = this.slotX(i) + (this.slot() - width) / 2;
    const yTop = this.y(value);
    const yBase = this.y(0);
    const r = Math.min(4, width / 2, yBase - yTop);
    return `M${x},${yBase} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + width - r} Q${x + width},${yTop} ${x + width},${yTop + r} V${yBase} Z`;
  }

  tooltipLeft(i: number): number {
    const center = this.slotX(i) + this.slot() / 2;
    return Math.min(85, Math.max(5, (center / this.w()) * 100));
  }
}
