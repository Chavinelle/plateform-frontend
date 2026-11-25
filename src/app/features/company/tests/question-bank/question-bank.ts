import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import {
  QUESTION_TYPES, QUESTION_TYPE_LABELS, TestQuestion, TestQuestionType
} from '../../../../../core/models/test.models';
import { AuthService } from '../../../../../core/services/auth.service';
import { TestQuestionService } from '../../../../../core/services/test-question.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { QuestionEditor } from '../question-editor/question-editor';
import { Loading } from '../../../../shared/loading/loading';

/** Banque de questions : filtres, création, modification, duplication, archivage. */
@Component({
  selector: 'app-question-bank',
  imports: [Loading, QuestionEditor],
  templateUrl: './question-bank.html',
  styleUrl: './question-bank.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuestionBank {
  private api = inject(TestQuestionService);
  private auth = inject(AuthService);

  readonly types = QUESTION_TYPES;
  readonly typeLabels = QUESTION_TYPE_LABELS;
  /** Un manager consulte seulement (le serveur le vérifie aussi). */
  canEdit = computed(() => this.auth.user()?.role !== 'MANAGER');

  category = signal<string | null>(null);
  type = signal<TestQuestionType | null>(null);
  showArchived = signal(false);

  questions = signal<TestQuestion[]>([]);
  categories = signal<string[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  busyId = signal<number | null>(null);

  /** 'new' : nouvelle question ; une question : modification ; null : éditeur fermé. */
  editing = signal<TestQuestion | 'new' | null>(null);
  editingQuestion = computed(() => {
    const e = this.editing();
    return e === 'new' ? null : e;
  });

  private editorHeading = viewChild<ElementRef<HTMLElement>>('editorHeading');
  private tick = signal(0);

  constructor() {
    const query = computed(() => ({
      category: this.category(), type: this.type(), includeArchived: this.showArchived(), tick: this.tick()
    }));
    toObservable(query).pipe(
      tap(() => this.loading.set(true)),
      switchMap(q => forkJoin({
        questions: this.api.list(q),
        categories: this.api.categories().pipe(catchError(() => of([] as string[])))
      }).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(res => {
      this.loading.set(false);
      if (!res) return;
      this.questions.set(res.questions);
      this.categories.set(res.categories);
    });
  }

  setCategory(value: string) {
    this.category.set(value || null);
  }

  setType(value: string) {
    this.type.set((value || null) as TestQuestionType | null);
  }

  openEditor(target: TestQuestion | 'new') {
    this.message.set(null);
    this.error.set(null);
    this.editing.set(target);
    setTimeout(() => this.editorHeading()?.nativeElement.focus());
  }

  closeEditor() {
    this.editing.set(null);
  }

  onSaved() {
    this.editing.set(null);
    this.message.set('Question enregistrée.');
    this.reload();
  }

  duplicate(q: TestQuestion) {
    this.busyId.set(q.id);
    this.message.set(null);
    this.error.set(null);
    this.api.duplicate(q.id).subscribe({
      next: copy => {
        this.busyId.set(null);
        this.reload();
        this.openEditor(copy);
        this.message.set('Copie créée : vous pouvez la modifier.');
      },
      error: err => {
        this.busyId.set(null);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  remove(q: TestQuestion) {
    this.run(q, this.api.remove(q.id), q.usedInTests
      ? 'Question archivée (elle figure dans un test) : elle ne pourra plus être ajoutée à un nouveau test.'
      : 'Question supprimée.');
  }

  restore(q: TestQuestion) {
    this.run(q, this.api.restore(q.id), 'Question restaurée.');
  }

  private run(q: TestQuestion, request: Observable<unknown>, success: string) {
    this.busyId.set(q.id);
    this.message.set(null);
    this.error.set(null);
    request.subscribe({
      next: () => {
        this.busyId.set(null);
        this.message.set(success);
        this.reload();
      },
      error: err => {
        this.busyId.set(null);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  private reload() {
    this.tick.update(n => n + 1);
  }
}
