import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, of, switchMap, tap } from 'rxjs';
import { EvaluationTemplate } from '../../../../core/models/evaluation.models';
import { AuthService } from '../../../../core/services/auth.service';
import { EvaluationTemplateService } from '../../../../core/services/evaluation-template.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { TemplateEditor } from './template-editor/template-editor';

/** Grilles d'évaluation de l'entreprise : liste, création, modification, grille par défaut, archivage. */
@Component({
  selector: 'app-evaluation-templates',
  imports: [TemplateEditor],
  templateUrl: './evaluation-templates.html',
  styleUrl: './evaluation-templates.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvaluationTemplates {
  private api = inject(EvaluationTemplateService);
  private auth = inject(AuthService);

  /** Un manager consulte seulement (le serveur le vérifie aussi). */
  canEdit = computed(() => this.auth.user()?.role !== 'MANAGER');
  showArchived = signal(false);
  templates = signal<EvaluationTemplate[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  busyId = signal<number | null>(null);

  /** 'new' : nouvelle grille ; une grille : modification ; null : éditeur fermé. */
  editing = signal<EvaluationTemplate | 'new' | null>(null);
  editingTemplate = computed(() => {
    const e = this.editing();
    return e === 'new' ? null : e;
  });

  private editorHeading = viewChild<ElementRef<HTMLElement>>('editorHeading');
  private reload$ = signal(0);

  constructor() {
    toObservable(computed(() => ({ archived: this.showArchived(), tick: this.reload$() }))).pipe(
      tap(() => this.loading.set(true)),
      switchMap(q => this.api.list(q.archived).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of([] as EvaluationTemplate[]);
      }))),
      takeUntilDestroyed()
    ).subscribe(list => {
      this.loading.set(false);
      this.templates.set(list);
    });
  }

  openEditor(target: EvaluationTemplate | 'new') {
    this.message.set(null);
    this.error.set(null);
    this.editing.set(target);
    setTimeout(() => this.editorHeading()?.nativeElement.focus());
  }

  closeEditor() {
    this.editing.set(null);
  }

  onSaved(t: EvaluationTemplate) {
    this.editing.set(null);
    this.message.set(t.newVersion
      ? `Nouvelle version de « ${t.name} » créée ; l'ancienne est archivée avec ses évaluations.`
      : `Grille « ${t.name} » enregistrée.`);
    this.reload();
  }

  makeDefault(t: EvaluationTemplate) {
    this.run(t, this.api.makeDefault(t.id), `« ${t.name} » est maintenant la grille par défaut.`);
  }

  restore(t: EvaluationTemplate) {
    this.run(t, this.api.restore(t.id), `Grille « ${t.name} » restaurée.`);
  }

  remove(t: EvaluationTemplate) {
    this.run(t, this.api.remove(t.id), t.used
      ? `Grille « ${t.name} » archivée (elle a déjà servi : ses évaluations restent lisibles).`
      : `Grille « ${t.name} » supprimée.`);
  }

  toggleArchived(checked: boolean) {
    this.showArchived.set(checked);
  }

  private run(t: EvaluationTemplate, request: Observable<unknown>, success: string) {
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
    this.reload$.update(n => n + 1);
  }
}
