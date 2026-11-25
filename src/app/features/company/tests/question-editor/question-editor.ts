import {
  ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChildren
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import {
  MAX_OPTIONS, MIN_OPTIONS, QUESTION_TYPES, TestQuestion, TestQuestionRequest, TestQuestionType, isChoice
} from '../../../../../core/models/test.models';
import { TestQuestionService } from '../../../../../core/services/test-question.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

type OptionForm = FormGroup<{
  label: FormControl<string>;
  correct: FormControl<boolean>;
}>;

/** Création ou modification d'une question de la banque. */
@Component({
  selector: 'app-question-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './question-editor.html',
  styleUrl: './question-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuestionEditor {
  private fb = inject(FormBuilder);
  private api = inject(TestQuestionService);

  /** null : nouvelle question. */
  question = input<TestQuestion | null>(null);
  /** Catégories existantes, proposées à la saisie. */
  categories = input<string[]>([]);
  saved = output<TestQuestion>();
  cancelled = output<void>();

  readonly types = QUESTION_TYPES;
  readonly maxOptions = MAX_OPTIONS;
  saving = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<TestQuestionType>('QCM_UNIQUE'),
    statement: ['', [Validators.required, Validators.maxLength(5000)]],
    points: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
    category: ['', Validators.maxLength(50)],
    options: this.fb.array<OptionForm>([])
  });

  get options(): FormArray<OptionForm> {
    return this.form.controls.options;
  }

  type = toSignal(this.form.controls.type.valueChanges.pipe(startWith(this.form.controls.type.value)),
    { requireSync: true });
  choice = computed(() => isChoice(this.type()));
  multiple = computed(() => this.type() === 'QCM_MULTIPLE');

  private optionInputs = viewChildren<ElementRef<HTMLInputElement>>('optionInput');

  constructor() {
    // (ré)initialise le formulaire quand la question à modifier change (et seulement dans ce cas)
    effect(() => {
      const q = this.question();
      untracked(() => {
        this.options.clear();
        q?.options.forEach(o => this.options.push(this.option(o.label, o.correct)));
        this.form.controls.statement.reset(q?.statement ?? '');
        this.form.controls.points.reset(q?.points ?? 1);
        this.form.controls.category.reset(q?.category ?? '');
        this.form.controls.type.setValue(q?.type ?? 'QCM_UNIQUE');
        this.syncOptions(q?.type ?? 'QCM_UNIQUE');
        this.error.set(null);
      });
    });

    // changement de type : un QCM a besoin de choix ; un QCM à réponse unique ne garde qu'une bonne réponse
    this.form.controls.type.valueChanges.pipe(takeUntilDestroyed()).subscribe(type => {
      this.syncOptions(type);
      if (type === 'QCM_UNIQUE') {
        const first = this.options.controls.findIndex(o => o.controls.correct.value);
        this.options.controls.forEach((o, i) => o.controls.correct.setValue(i === first));
      }
    });
  }

  addOption() {
    if (this.options.length >= MAX_OPTIONS) return;
    this.options.push(this.option('', false));
    setTimeout(() => this.optionInputs().at(-1)?.nativeElement.focus());
  }

  removeOption(index: number) {
    if (this.options.length <= MIN_OPTIONS) return;
    this.options.removeAt(index);
    setTimeout(() => this.optionInputs()[Math.min(index, this.options.length - 1)]?.nativeElement.focus());
  }

  /** QCM à réponse unique : cocher un choix décoche les autres. */
  markUnique(index: number) {
    this.options.controls.forEach((o, i) => o.controls.correct.setValue(i === index));
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
    const v = this.form.getRawValue();
    const choiceError = this.choice() ? this.checkChoices(v.type, v.options) : null;
    if (choiceError) {
      this.error.set(choiceError);
      return;
    }
    const body: TestQuestionRequest = {
      type: v.type,
      statement: v.statement.trim(),
      points: Number(v.points),
      category: v.category.trim() || null,
      options: this.choice() ? v.options.map(o => ({ label: o.label.trim(), correct: o.correct })) : []
    };
    const current = this.question();
    this.saving.set(true);
    this.error.set(null);
    (current ? this.api.update(current.id, body) : this.api.create(body)).subscribe({
      next: q => {
        this.saving.set(false);
        this.saved.emit(q);
      },
      error: err => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  /** Mêmes règles que le serveur, pour un message immédiat. */
  private checkChoices(type: TestQuestionType, options: { label: string; correct: boolean }[]): string | null {
    const correct = options.filter(o => o.correct).length;
    if (type === 'QCM_UNIQUE' && correct !== 1) return 'Indiquez la bonne réponse.';
    if (type === 'QCM_MULTIPLE' && correct < 1) return 'Cochez au moins une bonne réponse.';
    if (type === 'QCM_MULTIPLE' && correct === options.length) return 'Au moins un choix doit être faux.';
    const labels = options.map(o => o.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) return 'Deux choix ont le même libellé.';
    return null;
  }

  /** Question ouverte ou code : les choix sont désactivés (ignorés par la validation et à l'envoi). */
  private syncOptions(type: TestQuestionType) {
    if (!isChoice(type)) {
      this.options.disable({ emitEvent: false });
      return;
    }
    this.options.enable({ emitEvent: false });
    while (this.options.length < MIN_OPTIONS) this.options.push(this.option('', false));
  }

  private option(label: string, correct: boolean): OptionForm {
    return this.fb.nonNullable.group({
      label: [label, [Validators.required, Validators.maxLength(500)]],
      correct: [correct]
    });
  }
}
