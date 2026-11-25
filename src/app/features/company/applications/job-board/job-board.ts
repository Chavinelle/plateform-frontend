import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, catchError, of, switchMap, tap } from 'rxjs';
import {
  JobBoard, MoveStageRequest, RecruiterApplicationItem, RejectDecision, STATUS_FOR_STAGE_KIND
} from '../../../../../core/models/application.models';
import { Stage } from '../../../../../core/models/company.models';
import { RecruiterApplicationService } from '../../../../../core/services/recruiter-application.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { RejectForm } from '../reject-form/reject-form';
import { StarRating } from '../star-rating/star-rating';
import { Loading } from '../../../../shared/loading/loading';

interface BoardColumn { stage: Stage; cards: RecruiterApplicationItem[]; }
interface PendingReject { card: RecruiterApplicationItem; stage: Stage; }

@Component({
  selector: 'app-job-board',
  imports: [Loading, RouterLink, DatePipe, CdkDropListGroup, CdkDropList, CdkDrag, StarRating, RejectForm],
  templateUrl: './job-board.html',
  styleUrl: './job-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobBoardPage {
  private route = inject(ActivatedRoute);
  private api = inject(RecruiterApplicationService);

  jobId = signal<number | null>(null);
  board = signal<JobBoard | null>(null);
  cards = signal<RecruiterApplicationItem[]>([]);
  loading = signal(true);
  loadError = signal<string | null>(null);
  error = signal<string | null>(null);
  announce = signal('');
  busyIds = signal<ReadonlySet<number>>(new Set());
  filter = signal('');

  // ---- rejet : motif et message au candidat demandés dans une boîte de dialogue ----
  pendingReject = signal<PendingReject | null>(null);
  private rejectDialog = viewChild<ElementRef<HTMLDialogElement>>('rejectDialog');

  stages = computed(() => this.board()?.stages ?? []);
  canManage = computed(() => this.board()?.canManage ?? false);

  columns = computed<BoardColumn[]>(() => {
    const stages = this.stages();
    const entryId = stages.find(s => s.kind === 'ENTREE')?.id ?? null;
    const words = this.filter().trim().toLowerCase().split(/\s+/).filter(Boolean);
    const visible = this.cards().filter(c => words.every(w =>
      c.candidateName.toLowerCase().includes(w)
      || (c.headline ?? '').toLowerCase().includes(w)
      || c.skills.some(s => s.toLowerCase().includes(w))
      || c.tags.some(t => t.toLowerCase().includes(w))));
    return stages.map(stage => ({
      stage,
      cards: visible.filter(c => (c.stageId ?? entryId) === stage.id)
    }));
  });

  private load$ = new Subject<void>();

  constructor() {
    this.load$.pipe(
      tap(() => this.loadError.set(null)),
      switchMap(() => {
        const id = this.jobId();
        if (id === null) return of(null);
        return this.api.board(id).pipe(catchError(err => {
          this.loadError.set(extractErrorMessage(err));
          return of(null);
        }));
      }),
      takeUntilDestroyed()
    ).subscribe(board => {
      this.loading.set(false);
      if (!board) return;
      this.board.set(board);
      this.cards.set(board.cards);
    });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      const id = Number(pm.get('id'));
      this.board.set(null);
      this.cards.set([]);
      this.loading.set(true);
      if (!Number.isInteger(id)) {
        this.loading.set(false);
        this.loadError.set('Offre introuvable');
        return;
      }
      this.jobId.set(id);
      this.reload();
    });
  }

  reload() {
    this.error.set(null);
    this.load$.next();
  }

  onFilter(event: Event) {
    this.filter.set((event.target as HTMLInputElement).value);
  }

  // =================== Déplacements ===================

  /** Glisser-déposer : l'ordre à l'intérieur d'une colonne n'est pas enregistré (tri par date). */
  onDrop(event: CdkDragDrop<number, number, RecruiterApplicationItem>) {
    if (event.previousContainer === event.container) return;
    const stage = this.stages().find(s => s.id === event.container.data);
    if (stage) this.requestMove(event.item.data, stage);
  }

  /** Alternative au glisser-déposer, utilisable au clavier et avec un lecteur d'écran. */
  onSelectStage(card: RecruiterApplicationItem, event: Event) {
    const select = event.target as HTMLSelectElement;
    const stage = this.stages().find(s => s.id === Number(select.value));
    select.value = '';
    if (stage) this.requestMove(card, stage);
  }

  /** Initiales affichées dans la pastille de la carte (« Awa Kouassi » → « AK »). */
  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  canDrag(card: RecruiterApplicationItem): boolean {
    return this.canManage() && card.status !== 'RETIREE' && !this.busyIds().has(card.id);
  }

  otherStages(card: RecruiterApplicationItem): Stage[] {
    return this.stages().filter(s => s.id !== card.stageId);
  }

  private requestMove(card: RecruiterApplicationItem, stage: Stage) {
    if (!this.canDrag(card) || stage.id === card.stageId) return;
    if (stage.kind === 'REJET') {
      this.openReject(card, stage);
      return;
    }
    if (stage.kind === 'EMBAUCHE' && !confirm(`Marquer ${card.candidateName} comme embauché(e) ?`)) return;
    this.move(card, stage, { reason: null });
  }

  private move(card: RecruiterApplicationItem, stage: Stage, decision: Omit<MoveStageRequest, 'stageId' | 'expectedStageId'>) {
    this.error.set(null);
    const before = card;

    // mise à jour immédiate de l'écran, annulée si le serveur refuse
    this.replaceCard({
      ...card, stageId: stage.id, stageName: stage.name, stageColor: stage.color,
      status: STATUS_FOR_STAGE_KIND[stage.kind]
    });
    this.setBusy(card.id, true);

    this.api.moveToStage(card.id, { stageId: stage.id, expectedStageId: before.stageId, ...decision }).subscribe({
      next: updated => {
        this.setBusy(card.id, false);
        this.replaceCard({
          ...before, stageId: updated.stageId, stageName: updated.stageName, stageColor: updated.stageColor,
          status: updated.status, updatedAt: updated.updatedAt
        });
        this.announce.set(`${card.candidateName} déplacé(e) vers « ${stage.name} ».`);
      },
      error: err => {
        this.setBusy(card.id, false);
        this.replaceCard(before);
        this.error.set(extractErrorMessage(err));
        if (err instanceof HttpErrorResponse && err.status === 409) this.reload();   // déplacée par un collègue
      }
    });
  }

  // =================== Boîte de dialogue de rejet ===================

  private openReject(card: RecruiterApplicationItem, stage: Stage) {
    this.pendingReject.set({ card, stage });
    this.rejectDialog()?.nativeElement.showModal();
  }

  confirmReject(decision: RejectDecision) {
    const pending = this.pendingReject();
    if (!pending) return;
    this.closeReject();
    this.move(pending.card, pending.stage, decision);
  }

  closeReject() {
    this.rejectDialog()?.nativeElement.close();
    this.pendingReject.set(null);
  }

  // =================== Outils ===================

  private replaceCard(card: RecruiterApplicationItem) {
    this.cards.update(list => list.map(c => (c.id === card.id ? card : c)));
  }

  private setBusy(id: number, busy: boolean) {
    this.busyIds.update(ids => {
      const next = new Set(ids);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });
  }
}
