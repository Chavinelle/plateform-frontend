import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChildren } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, of, switchMap, tap } from 'rxjs';
import { REFERENTIAL_LABELS, ReferentialKind, ReferentialView } from '../../../../core/models/referential.models';
import { ReferentialService } from '../../../../core/services/referential.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';

/** Référentiels (secteurs, compétences, villes) : entrées, valeurs libres à intégrer, fusion des doublons. */
@Component({
  selector: 'app-admin-referentials',
  templateUrl: './admin-referentials.html',
  styleUrl: '../admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminReferentials {
  private api = inject(ReferentialService);

  readonly kinds = Object.keys(REFERENTIAL_LABELS) as ReferentialKind[];
  readonly labels = REFERENTIAL_LABELS;
  kind = signal<ReferentialKind>('COMPETENCE');
  view = signal<ReferentialView | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  busy = signal(false);

  newLabel = signal('');
  editingId = signal<number | null>(null);
  editLabel = signal('');
  /** Valeur libre en cours de fusion, et entrée cible choisie. */
  merging = signal<string | null>(null);
  mergeTarget = signal<number | null>(null);
  activeItems = computed(() => (this.view()?.items ?? []).filter(i => !i.archived));

  private tabs = viewChildren<ElementRef<HTMLButtonElement>>('tab');
  private tick = signal(0);

  constructor() {
    toObservable(computed(() => ({ kind: this.kind(), t: this.tick() }))).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(q => this.api.view(q.kind).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(v => {
      this.loading.set(false);
      if (v) this.view.set(v);
    });
  }

  select(kind: ReferentialKind) {
    this.kind.set(kind);
    this.editingId.set(null);
    this.merging.set(null);
    this.message.set(null);
  }

  /** Onglets au clavier (flèches, Début, Fin). */
  onTabKey(event: KeyboardEvent, index: number) {
    const last = this.kinds.length - 1;
    const target = event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0 : event.key === 'End' ? last : null;
    if (target === null) return;
    event.preventDefault();
    this.select(this.kinds[target]);
    this.tabs()[target]?.nativeElement.focus();
  }

  add(label = this.newLabel()) {
    if (!label.trim()) return;
    this.run(this.api.create(this.kind(), label), `« ${label.trim()} » ajouté ; les orthographes voisines ont été harmonisées.`,
      () => this.newLabel.set(''));
  }

  startEdit(id: number, label: string) {
    this.editingId.set(id);
    this.editLabel.set(label);
  }

  saveEdit() {
    const id = this.editingId();
    if (id === null || !this.editLabel().trim()) return;
    this.run(this.api.rename(this.kind(), id, this.editLabel()), 'Entrée renommée ; les données ont suivi.',
      () => this.editingId.set(null));
  }

  setArchived(id: number, archived: boolean) {
    this.run(this.api.setArchived(this.kind(), id, archived), archived ? 'Entrée archivée (retirée des suggestions).' : 'Entrée réactivée.');
  }

  startMerge(value: string) {
    this.merging.set(value);
    this.mergeTarget.set(this.activeItems()[0]?.id ?? null);
  }

  confirmMerge() {
    const value = this.merging();
    const target = this.mergeTarget();
    if (!value || target === null) return;
    const label = this.view()?.items.find(i => i.id === target)?.label ?? '';
    this.run(this.api.merge(this.kind(), value, target), `« ${value} » remplacé par « ${label} » dans les données.`,
      () => this.merging.set(null));
  }

  private run(request: Observable<ReferentialView>, success: string, after?: () => void) {
    this.busy.set(true);
    this.error.set(null);
    this.message.set(null);
    request.subscribe({
      next: v => {
        this.busy.set(false);
        this.view.set(v);
        this.api.invalidate(this.kind());
        this.message.set(success);
        after?.();
      },
      error: err => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
