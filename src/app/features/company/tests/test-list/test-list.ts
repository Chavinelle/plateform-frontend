import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, of, switchMap, tap } from 'rxjs';
import { OnlineTest, QUESTION_TYPE_LABELS } from '../../../../../core/models/test.models';
import { AuthService } from '../../../../../core/services/auth.service';
import { OnlineTestService } from '../../../../../core/services/online-test.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { TestEditor } from '../test-editor/test-editor';

/** Tests de l'entreprise : liste, création, modification, duplication, archivage. */
@Component({
  selector: 'app-test-list',
  imports: [TestEditor],
  templateUrl: './test-list.html',
  styleUrl: './test-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestList {
  private api = inject(OnlineTestService);
  private auth = inject(AuthService);

  readonly typeLabels = QUESTION_TYPE_LABELS;
  /** Un manager consulte seulement (le serveur le vérifie aussi). */
  canEdit = computed(() => this.auth.user()?.role !== 'MANAGER');
  showArchived = signal(false);
  tests = signal<OnlineTest[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  busyId = signal<number | null>(null);
  /** Tests dont le détail des questions est déplié. */
  expanded = signal<ReadonlySet<number>>(new Set());

  /** 'new' : nouveau test ; un test : modification ; null : éditeur fermé. */
  editing = signal<OnlineTest | 'new' | null>(null);
  editingTest = computed(() => {
    const e = this.editing();
    return e === 'new' ? null : e;
  });

  private editorHeading = viewChild<ElementRef<HTMLElement>>('editorHeading');
  private tick = signal(0);

  constructor() {
    toObservable(computed(() => ({ archived: this.showArchived(), tick: this.tick() }))).pipe(
      tap(() => this.loading.set(true)),
      switchMap(q => this.api.list(q.archived).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(list => {
      this.loading.set(false);
      if (list) this.tests.set(list);
    });
  }

  openEditor(target: OnlineTest | 'new') {
    this.message.set(null);
    this.error.set(null);
    this.editing.set(target);
    setTimeout(() => this.editorHeading()?.nativeElement.focus());
  }

  closeEditor() {
    this.editing.set(null);
  }

  onSaved(t: OnlineTest) {
    this.editing.set(null);
    this.message.set(`Test « ${t.title} » enregistré.`);
    this.reload();
  }

  toggle(id: number) {
    this.expanded.update(set => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  duplicate(t: OnlineTest) {
    this.busyId.set(t.id);
    this.message.set(null);
    this.error.set(null);
    this.api.duplicate(t.id).subscribe({
      next: copy => {
        this.busyId.set(null);
        this.reload();
        this.openEditor(copy);
        this.message.set(`Copie « ${copy.title} » créée : vous pouvez la modifier.`);
      },
      error: err => {
        this.busyId.set(null);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  remove(t: OnlineTest) {
    this.run(t, this.api.remove(t.id), t.locked
      ? `Test « ${t.title} » archivé (il a déjà été envoyé : les résultats restent lisibles).`
      : `Test « ${t.title} » supprimé.`);
  }

  restore(t: OnlineTest) {
    this.run(t, this.api.restore(t.id), `Test « ${t.title} » restauré.`);
  }

  private run(t: OnlineTest, request: Observable<unknown>, success: string) {
    this.busyId.set(t.id);
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
