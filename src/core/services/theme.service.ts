import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

/** Thème choisi : celui du système, ou clair / sombre imposé par l'utilisateur. */
export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';
const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];
const LABELS: Record<ThemeChoice, string> = { system: 'automatique', light: 'clair', dark: 'sombre' };

/**
 * Thème de l'interface (clair ou sombre). Le choix est appliqué par l'attribut data-theme de <html>,
 * que lisent les variables de couleur (styles/_tokens.scss), et retenu dans le navigateur.
 * Sans choix, l'interface suit le réglage du système (prefers-color-scheme).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);
  private readonly _choice = signal<ThemeChoice>(readStored());

  readonly choice = this._choice.asReadonly();
  readonly label = computed(() => LABELS[this._choice()]);
  readonly next = computed(() => ORDER[(ORDER.indexOf(this._choice()) + 1) % ORDER.length]);
  readonly nextLabel = computed(() => LABELS[this.next()]);

  constructor() {
    effect(() => {
      const choice = this._choice();
      const root = this.document.documentElement;
      if (choice === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', choice);
      try {
        if (choice === 'system') localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, choice);
      } catch {
        // stockage indisponible (navigation privée) : le choix vaut pour la session
      }
    });
  }

  /** Passe au thème suivant : automatique → clair → sombre → automatique. */
  cycle() {
    this._choice.set(this.next());
  }
}

function readStored(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}
