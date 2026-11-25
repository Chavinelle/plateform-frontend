import {
  ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAX_TEST_QUESTIONS, OnlineTest, OnlineTestRequest, QUESTION_TYPES, QUESTION_TYPE_LABELS, TestQuestion, TestQuestionType
} from '../../../../../core/models/test.models';
import { OnlineTestService } from '../../../../../core/services/online-test.service';
import { TestQuestionService } from '../../../../../core/services/test-question.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

/** Création ou modification d'un test : titre, consignes, durée et questions choisies dans la banque. */
@Component({
  selector: 'app-test-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './test-editor.html',
  styleUrl: './test-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestEditor {
  private fb = inject(FormBuilder);
  private api = inject(OnlineTestService);
  private questionApi = inject(TestQuestionService);

  /** null : nouveau test. */
  test = input<OnlineTest | null>(null);
  saved = output<OnlineTest>();
  cancelled = output<void>();

  readonly types = QUESTION_TYPES;
  readonly typeLabels = QUESTION_TYPE_LABELS;
  readonly maxQuestions = MAX_TEST_QUESTIONS;
  saving = signal(false);
  error = signal<string | null>(null);
  announce = signal('');

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    instructions: ['', Validators.maxLength(5000)],
    durationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(240)]]
  });

  /** Questions du test, dans l'ordre. */
  selected = signal<TestQuestion[]>([]);
  totalPoints = computed(() => this.selected().reduce((sum, q) => sum + q.points, 0));

  // ----- banque (questions actives) et filtres de recherche -----
  bank = signal<TestQuestion[]>([]);
  bankLoading = signal(true);
  search = signal('');
  category = signal<string | null>(null);
  type = signal<TestQuestionType | null>(null);
  bankCategories = computed(() =>
    [...new Set(this.bank().map(q => q.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b)));
  available = computed(() => {
    const taken = new Set(this.selected().map(q => q.id));
    const text = this.search().trim().toLowerCase();
    return this.bank().filter(q => !taken.has(q.id)
      && (!this.category() || q.category === this.category())
      && (!this.type() || q.type === this.type())
      && (!text || q.statement.toLowerCase().includes(text)));
  });

  private selectedHeading = viewChild<ElementRef<HTMLElement>>('selectedHeading');

  constructor() {
    this.questionApi.list().pipe(takeUntilDestroyed()).subscribe({
      next: list => {
        this.bank.set(list);
        this.bankLoading.set(false);
      },
      error: err => {
        this.bankLoading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });

    // (ré)initialise le formulaire quand le test à modifier change
    effect(() => {
      const t = this.test();
      untracked(() => {
        this.form.reset({
          title: t?.title ?? '',
          instructions: t?.instructions ?? '',
          durationMinutes: t?.durationMinutes ?? 30
        });
        this.selected.set(t ? [...t.questions] : []);
        this.error.set(null);
      });
    });
  }

  add(q: TestQuestion) {
    if (this.selected().length >= MAX_TEST_QUESTIONS) {
      this.error.set(`${MAX_TEST_QUESTIONS} questions maximum par test.`);
      return;
    }
    this.selected.update(list => [...list, q]);
    this.announce.set(`Question ajoutée. ${this.summary()}`);
  }

  remove(index: number) {
    this.selected.update(list => list.filter((_, i) => i !== index));
    this.announce.set(`Question retirée. ${this.summary()}`);
    this.selectedHeading()?.nativeElement.focus();
  }

  move(index: number, direction: -1 | 1) {
    const target = index + direction;
    const list = [...this.selected()];
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.selected.set(list);
    this.announce.set(`Question déplacée en position ${target + 1}.`);
  }

  setCategory(value: string) {
    this.category.set(value || null);
  }

  setType(value: string) {
    this.type.set((value || null) as TestQuestionType | null);
  }

  invalid(control: { invalid: boolean; touched: boolean; dirty: boolean }): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Corrigez les champs signalés.');
      return;
    }
    if (!this.selected().length) {
      this.error.set('Ajoutez au moins une question au test.');
      return;
    }
    const v = this.form.getRawValue();
    const body: OnlineTestRequest = {
      title: v.title.trim(),
      instructions: v.instructions.trim() || null,
      durationMinutes: Number(v.durationMinutes),
      questionIds: this.selected().map(q => q.id)
    };
    const current = this.test();
    this.saving.set(true);
    this.error.set(null);
    (current ? this.api.update(current.id, body) : this.api.create(body)).subscribe({
      next: t => {
        this.saving.set(false);
        this.saved.emit(t);
      },
      error: err => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  excerpt(text: string): string {
    return text.length > 120 ? text.slice(0, 117) + '…' : text;
  }

  private summary(): string {
    const n = this.selected().length;
    return `${n} question${n > 1 ? 's' : ''}, ${this.totalPoints()} points.`;
  }
}
