import { Component, OnInit, inject, input, signal } from '@angular/core';
import {
  QUESTION_TYPE_LABELS, Question, QuestionRequest, QuestionType
} from '../../../../../core/models/company.models';
import { JobService } from '../../../../../core/services/job.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

interface QuestionDraft {
  id: number | null;
  label: string;
  type: QuestionType;
  required: boolean;
  knockout: boolean;
  expectedAnswer: 'OUI' | 'NON';
  options: { label: string; accepted: boolean }[];
}

const MAX_QUESTIONS = 10;
const MAX_OPTIONS = 10;

const isChoice = (t: QuestionType) => t === 'CHOIX_UNIQUE' || t === 'CHOIX_MULTIPLE';

@Component({
  selector: 'app-questions-editor',
  imports: [],
  templateUrl: './questions-editor.html',
  styleUrl: './questions-editor.scss'
})
export class QuestionsEditor implements OnInit {
  private api = inject(JobService);

  jobId = input.required<number>();
  readonly = input(false);

  items = signal<QuestionDraft[]>([]);
  loading = signal(true);
  saving = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  types = (Object.keys(QUESTION_TYPE_LABELS) as QuestionType[])
    .map(value => ({ value, label: QUESTION_TYPE_LABELS[value] }));
  maxQuestions = MAX_QUESTIONS;
  maxOptions = MAX_OPTIONS;
  isChoice = isChoice;

  ngOnInit() {
    this.api.getQuestions(this.jobId()).subscribe({
      next: list => {
        this.items.set(list.map(q => this.fromServer(q)));
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  // ---- lecture des événements ----
  val(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }
  chk(e: Event): boolean {
    return (e.target as HTMLInputElement).checked;
  }

  canKnockout(q: QuestionDraft): boolean {
    return q.type === 'OUI_NON' || q.type === 'CHOIX_UNIQUE';
  }

  // ---- modifications (mises à jour immuables) ----
  private edit(i: number, change: (q: QuestionDraft) => QuestionDraft) {
    this.message.set(null);
    this.items.update(list => list.map((q, idx) => (idx === i ? change(q) : q)));
  }

  add() {
    if (this.items().length >= MAX_QUESTIONS) return;
    this.message.set(null);
    this.items.update(list => [...list, {
      id: null, label: '', type: 'TEXTE', required: true, knockout: false, expectedAnswer: 'OUI', options: []
    }]);
  }

  remove(i: number) {
    this.message.set(null);
    this.items.update(list => list.filter((_, idx) => idx !== i));
  }

  move(i: number, delta: number) {
    const j = i + delta;
    this.items.update(list => {
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  setLabel(i: number, label: string) {
    this.edit(i, q => ({ ...q, label }));
  }

  setType(i: number, value: string) {
    const type = value as QuestionType;
    this.edit(i, q => ({
      ...q,
      type,
      knockout: type === 'OUI_NON' || type === 'CHOIX_UNIQUE' ? q.knockout : false,
      options: !isChoice(type) ? [] : q.options.length >= 2 ? q.options
        : [{ label: 'Option 1', accepted: true }, { label: 'Option 2', accepted: true }]
    }));
  }

  setRequired(i: number, required: boolean) {
    this.edit(i, q => ({ ...q, required }));
  }

  setKnockout(i: number, knockout: boolean) {
    this.edit(i, q => ({
      ...q,
      knockout,
      required: knockout ? true : q.required,
      // pour un choix unique : première réponse acceptée, les autres refusées (à ajuster par l'utilisateur)
      options: knockout && q.type === 'CHOIX_UNIQUE'
        ? q.options.map((o, idx) => ({ ...o, accepted: idx === 0 })) : q.options
    }));
  }

  setExpected(i: number, value: string) {
    this.edit(i, q => ({ ...q, expectedAnswer: value === 'NON' ? 'NON' : 'OUI' }));
  }

  setOptionLabel(i: number, j: number, label: string) {
    this.edit(i, q => ({ ...q, options: q.options.map((o, idx) => (idx === j ? { ...o, label } : o)) }));
  }

  setOptionAccepted(i: number, j: number, accepted: boolean) {
    this.edit(i, q => ({ ...q, options: q.options.map((o, idx) => (idx === j ? { ...o, accepted } : o)) }));
  }

  addOption(i: number) {
    this.edit(i, q => q.options.length >= MAX_OPTIONS ? q
      : { ...q, options: [...q.options, { label: '', accepted: !q.knockout }] });
  }

  removeOption(i: number, j: number) {
    this.edit(i, q => ({ ...q, options: q.options.filter((_, idx) => idx !== j) }));
  }

  // ---- enregistrement ----
  save() {
    const problem = this.validate();
    if (problem) {
      this.error.set(problem);
      return;
    }
    const payload: QuestionRequest[] = this.items().map(q => ({
      id: q.id,
      label: q.label.trim(),
      type: q.type,
      required: q.required || q.knockout,
      knockout: q.knockout,
      expectedAnswer: q.type === 'OUI_NON' && q.knockout ? q.expectedAnswer : null,
      options: isChoice(q.type) ? q.options.map(o => ({ label: o.label.trim(), accepted: o.accepted })) : []
    }));

    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);
    this.api.saveQuestions(this.jobId(), payload).subscribe({
      next: saved => {
        this.saving.set(false);
        this.items.set(saved.map(q => this.fromServer(q)));    // récupère les identifiants attribués
        this.message.set('Questions enregistrées.');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  private validate(): string | null {
    const items = this.items();
    for (let i = 0; i < items.length; i++) {
      const q = items[i];
      const where = `Question ${i + 1} : `;
      if (!q.label.trim()) return where + 'l\'intitulé est obligatoire.';
      if (isChoice(q.type)) {
        const labels = q.options.map(o => o.label.trim().toLowerCase());
        if (labels.some(l => !l)) return where + 'toutes les options doivent avoir un libellé.';
        if (new Set(labels).size !== labels.length) return where + 'deux options ont le même libellé.';
        if (q.knockout) {
          const accepted = q.options.filter(o => o.accepted).length;
          if (accepted === 0 || accepted === q.options.length) {
            return where + 'une question éliminatoire doit avoir au moins une réponse acceptée et une réponse refusée.';
          }
        }
      }
    }
    return null;
  }

  private fromServer(q: Question): QuestionDraft {
    return {
      id: q.id,
      label: q.label,
      type: q.type,
      required: q.required,
      knockout: q.knockout,
      expectedAnswer: q.expectedAnswer === 'NON' ? 'NON' : 'OUI',
      options: q.options.map(o => ({ label: o.label, accepted: o.accepted }))
    };
  }
}
