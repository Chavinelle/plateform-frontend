import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

let nextId = 0;

/**
 * Note sur 5 étoiles.
 * En lecture seule : une simple image accessible. Modifiable : un groupe de boutons radio
 * (navigation aux flèches du clavier, annoncé par les lecteurs d'écran).
 */
@Component({
  selector: 'app-star-rating',
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StarRating {
  value = input<number | null>(null);
  readonly = input(false);
  disabled = input(false);
  /** Libellé du groupe, ex. « Note de Jean Dupont ». */
  label = input('Note');
  changed = output<number | null>();

  readonly stars = [1, 2, 3, 4, 5];
  readonly name = `rating-${nextId++}`;
  summary = computed(() => {
    const v = this.value();
    return v === null ? 'Non noté' : `${v} étoile${v > 1 ? 's' : ''} sur 5`;
  });

  select(star: number) {
    if (!this.disabled() && star !== this.value()) this.changed.emit(star);
  }

  clear() {
    if (!this.disabled()) this.changed.emit(null);
  }
}
