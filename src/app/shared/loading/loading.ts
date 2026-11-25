import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type LoadingVariant = 'page' | 'cards' | 'list' | 'table' | 'block';

/**
 * Chargement : squelette animé qui a la forme du contenu attendu (cartes, liste, tableau, page).
 * Le squelette est décoratif (aria-hidden) ; les lecteurs d'écran entendent seulement « Chargement… » (role="status").
 * L'animation est coupée si l'utilisateur demande moins d'animations (règle globale prefers-reduced-motion).
 */
@Component({
  selector: 'app-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loading" role="status">
      <span class="sr-only">{{ label() }}</span>
      <div aria-hidden="true">
        @switch (variant()) {
          @case ('cards') {
            <div class="sk-cards">
              @for (i of rows(); track i) {
                <div class="sk-card">
                  <div class="sk-row"><span class="sk sk-avatar"></span><span class="sk-col"><span class="sk sk-line w60"></span><span class="sk sk-line w40"></span></span></div>
                  <span class="sk sk-line w80"></span><span class="sk sk-line w90"></span><span class="sk sk-line w50"></span>
                </div>
              }
            </div>
          }
          @case ('table') {
            <div class="sk-table">
              <span class="sk sk-head"></span>
              @for (i of rows(); track i) {
                <div class="sk-trow"><span class="sk sk-line w30"></span><span class="sk sk-line w20"></span><span class="sk sk-line w15"></span><span class="sk sk-line w20"></span></div>
              }
            </div>
          }
          @case ('page') {
            <div class="sk-page">
              <span class="sk sk-title"></span>
              <div class="sk-card"><span class="sk sk-line w40"></span><span class="sk sk-line w90"></span><span class="sk sk-line w80"></span><span class="sk sk-line w60"></span></div>
              <div class="sk-card"><span class="sk sk-line w30"></span><span class="sk sk-line w90"></span><span class="sk sk-line w70"></span></div>
            </div>
          }
          @case ('block') {
            <div class="sk-list"><span class="sk sk-line w90"></span><span class="sk sk-line w70"></span></div>
          }
          @default {
            <div class="sk-list">
              @for (i of rows(); track i) {
                <div class="sk-row"><span class="sk sk-dot"></span><span class="sk-col"><span class="sk sk-line w50"></span><span class="sk sk-line w80"></span></span></div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .sk {
      display: block; border-radius: 6px;
      background: linear-gradient(90deg, var(--surface-3) 0%, var(--surface-2) 50%, var(--surface-3) 100%) 0 0 / 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    @keyframes shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
    .sk-line { height: .7rem; }
    .sk-title { height: 1.6rem; width: 35%; margin-bottom: 1.25rem; }
    .sk-head { height: 2.4rem; border-radius: 0; }
    .sk-avatar { width: 44px; height: 44px; border-radius: 10px; flex: none; }
    .sk-dot { width: 36px; height: 36px; border-radius: 50%; flex: none; }
    .sk-row { display: flex; gap: .8rem; align-items: center; }
    .sk-col { display: flex; flex-direction: column; gap: .5rem; flex: 1; }
    .sk-card {
      display: flex; flex-direction: column; gap: .65rem; padding: 1.2rem;
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
    }
    .sk-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap: 1rem; }
    .sk-page { display: flex; flex-direction: column; gap: 1rem; }
    .sk-list { display: flex; flex-direction: column; gap: 1rem; padding: .25rem 0; }
    .sk-table { border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; background: var(--surface); }
    .sk-trow { display: flex; gap: 1.5rem; padding: 1rem; border-top: 1px solid var(--border); }
    .w15 { width: 15%; } .w20 { width: 20%; } .w30 { width: 30%; } .w40 { width: 40%; } .w50 { width: 50%; }
    .w60 { width: 60%; } .w70 { width: 70%; } .w80 { width: 80%; } .w90 { width: 90%; }
    @media (forced-colors: active) { .sk { background: GrayText; } }
  `,
})
export class Loading {
  readonly variant = input<LoadingVariant>('list');
  /** Nombre de lignes ou de cartes du squelette. */
  readonly count = input(3);
  readonly label = input('Chargement…');
  protected readonly rows = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
