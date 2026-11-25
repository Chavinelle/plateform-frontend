import {
  ChangeDetectionStrategy, Component, ElementRef, computed, input, model, signal, viewChild
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PersonRef } from '../../../../../core/models/company.models';

const MAX_SUGGESTIONS = 6;
/** « @ » en début de texte ou après un espace, suivi de ce qui est en cours de saisie. */
const MENTION_TRIGGER = /(^|\s)@([^@\n]{0,40})$/;

/**
 * Zone de texte qui propose les collègues dès que l'on tape « @ ».
 * Clavier : flèches pour parcourir, Entrée ou Tab pour choisir, Échap pour fermer.
 */
@Component({
  selector: 'app-mention-input',
  imports: [ReactiveFormsModule],
  templateUrl: './mention-input.html',
  styleUrl: './mention-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MentionInput {
  control = input.required<FormControl<string>>();
  people = input<PersonRef[]>([]);
  inputId = input.required<string>();
  rows = input(3);
  maxLength = input(4000);
  placeholder = input('');
  /** Personnes choisies dans la liste pendant la saisie. */
  mentions = model<PersonRef[]>([]);

  query = signal<string | null>(null);
  activeIndex = signal(0);
  private tokenStart = 0;
  private textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea');

  matches = computed(() => {
    const q = this.query();
    if (q === null) return [];
    const needle = normalize(q);
    return this.people()
      .filter(p => normalize(p.name).split(' ').some(w => w.startsWith(needle)) || normalize(p.name).startsWith(needle))
      .slice(0, MAX_SUGGESTIONS);
  });
  open = computed(() => this.matches().length > 0);
  listId = computed(() => `${this.inputId()}-mentions`);
  activeOptionId = computed(() => (this.open() ? `${this.listId()}-${this.activeIndex()}` : null));
  announcement = computed(() => {
    const n = this.matches().length;
    if (!n) return '';
    return `${n} collègue${n > 1 ? 's' : ''} proposé${n > 1 ? 's' : ''}. Flèches pour parcourir, Entrée pour choisir.`;
  });

  onInput() {
    const ta = this.textarea().nativeElement;
    const before = ta.value.slice(0, ta.selectionStart);
    const match = MENTION_TRIGGER.exec(before);
    if (match) {
      this.tokenStart = before.length - match[2].length - 1;   // position du « @ »
      this.query.set(match[2]);
      this.activeIndex.set(0);
    } else {
      this.close();
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (!this.open()) return;
    const count = this.matches().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.update(i => (i + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.update(i => (i - 1 + count) % count);
        break;
      case 'Enter':
      case 'Tab':
        event.preventDefault();
        this.select(this.matches()[this.activeIndex()]);
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  /** mousedown (et non click) : la zone de texte garde le focus. */
  pick(event: MouseEvent, person: PersonRef) {
    event.preventDefault();
    this.select(person);
  }

  close() {
    this.query.set(null);
  }

  private select(person: PersonRef) {
    const ta = this.textarea().nativeElement;
    const caret = ta.selectionStart;
    const inserted = `@${person.name} `;
    const value = ta.value.slice(0, this.tokenStart) + inserted + ta.value.slice(caret);
    this.control().setValue(value);
    ta.value = value;                                            // le curseur se place juste après
    const position = this.tokenStart + inserted.length;
    ta.setSelectionRange(position, position);
    this.mentions.update(list => (list.some(p => p.id === person.id) ? list : [...list, person]));
    this.close();
  }
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
