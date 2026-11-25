import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

const MAX_TAGS = 10;
const MAX_LENGTH = 30;
let nextId = 0;

/** Ajout et retrait d'étiquettes, avec suggestions issues de l'entreprise. */
@Component({
  selector: 'app-tag-editor',
  templateUrl: './tag-editor.html',
  styleUrl: './tag-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagEditor {
  tags = input.required<string[]>();
  suggestions = input<string[]>([]);
  disabled = input(false);
  changed = output<string[]>();

  draft = signal('');
  error = signal<string | null>(null);
  readonly id = `tags-${nextId++}`;
  readonly maxLength = MAX_LENGTH;

  /** Suggestions pas encore utilisées sur cette candidature. */
  available = computed(() => {
    const used = new Set(this.tags().map(t => t.toLowerCase()));
    return this.suggestions().filter(s => !used.has(s.toLowerCase()));
  });
  full = computed(() => this.tags().length >= MAX_TAGS);

  onInput(event: Event) {
    this.draft.set((event.target as HTMLInputElement).value);
    this.error.set(null);
  }

  add(event?: Event) {
    event?.preventDefault();                       // Entrée ne doit pas soumettre un formulaire parent
    const tag = this.draft().trim().replace(/\s+/g, ' ');
    if (!tag) return;
    if (this.full()) {
      this.error.set(`${MAX_TAGS} étiquettes maximum.`);
      return;
    }
    if (this.tags().some(t => t.toLowerCase() === tag.toLowerCase())) {
      this.error.set('Cette étiquette est déjà présente.');
      return;
    }
    this.draft.set('');
    this.changed.emit([...this.tags(), tag]);
  }

  remove(tag: string) {
    this.changed.emit(this.tags().filter(t => t !== tag));
  }
}
