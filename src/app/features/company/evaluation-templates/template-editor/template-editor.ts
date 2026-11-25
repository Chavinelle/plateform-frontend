import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, viewChildren } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { EvaluationTemplate, MAX_CRITERIA } from '../../../../../core/models/evaluation.models';
import { EvaluationTemplateService } from '../../../../../core/services/evaluation-template.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

type CriterionForm = FormGroup<{
  label: FormControl<string>;
  description: FormControl<string>;
  weight: FormControl<number>;
}>;

/** Création ou modification d'une grille : nom, description et critères pondérés. */
@Component({
  selector: 'app-template-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './template-editor.html',
  styleUrl: './template-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TemplateEditor {
  private fb = inject(FormBuilder);
  private api = inject(EvaluationTemplateService);

  /** null : nouvelle grille. */
  template = input<EvaluationTemplate | null>(null);
  saved = output<EvaluationTemplate>();
  cancelled = output<void>();

  saving = signal(false);
  error = signal<string | null>(null);
  readonly maxCriteria = MAX_CRITERIA;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(1000)],
    criteria: this.fb.array<CriterionForm>([])
  });

  get criteria(): FormArray<CriterionForm> {
    return this.form.controls.criteria;
  }

  /** Valeurs du formulaire en signal, pour calculer les pourcentages en direct. */
  private values = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), { requireSync: true });
  totalWeight = computed(() => (this.values().criteria ?? []).reduce((sum, c) => sum + (Number(c?.weight) || 0), 0));
  percents = computed(() => {
    const total = this.totalWeight();
    return (this.values().criteria ?? []).map(c => (total ? Math.round((Number(c?.weight) || 0) * 100 / total) : 0));
  });

  private labelInputs = viewChildren<ElementRef<HTMLInputElement>>('labelInput');

  constructor() {
    // (re)initialise le formulaire quand la grille à modifier change
    effect(() => {
      const t = this.template();
      this.criteria.clear();
      if (t) {
        this.form.patchValue({ name: t.name, description: t.description ?? '' });
        t.criteria.forEach(c => this.criteria.push(this.criterion(c.label, c.description ?? '', c.weight)));
      } else {
        this.form.patchValue({ name: '', description: '' });
        this.criteria.push(this.criterion('', '', 25));
      }
      this.error.set(null);
    });
  }

  addCriterion() {
    if (this.criteria.length >= MAX_CRITERIA) return;
    this.criteria.push(this.criterion('', '', 25));
    setTimeout(() => this.labelInputs().at(-1)?.nativeElement.focus());
  }

  removeCriterion(index: number) {
    if (this.criteria.length <= 1) return;
    this.criteria.removeAt(index);
    setTimeout(() => this.labelInputs()[Math.min(index, this.criteria.length - 1)]?.nativeElement.focus());
  }

  move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= this.criteria.length) return;
    const control = this.criteria.at(index);
    this.criteria.removeAt(index);
    this.criteria.insert(target, control);
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
    const body = {
      name: v.name.trim(),
      description: v.description.trim() || null,
      criteria: v.criteria.map(c => ({
        label: c.label.trim(),
        description: c.description.trim() || null,
        weight: Number(c.weight)
      }))
    };
    const current = this.template();
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

  private criterion(label: string, description: string, weight: number): CriterionForm {
    return this.fb.nonNullable.group({
      label: [label, [Validators.required, Validators.maxLength(100)]],
      description: [description, Validators.maxLength(500)],
      weight: [weight, [Validators.required, Validators.min(1), Validators.max(100)]]
    });
  }
}
