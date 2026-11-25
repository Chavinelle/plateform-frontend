import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal, viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, concatMap, debounceTime, groupBy, mergeMap } from 'rxjs';
import {
  PublicTestQuestion, PublicTestView, QUESTION_TYPE_LABELS, TestAnswerInput
} from '../../../../core/models/test.models';
import { PublicTestService } from '../../../../core/services/public-test.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';

type SaveState = 'saving' | 'saved' | 'error';
interface Draft { selected: number[]; text: string }

/**
 * Passage d'un test par le candidat, via son lien unique.
 * Le temps restant vient du serveur ; le minuteur du navigateur n'est qu'un affichage.
 * Chaque réponse est enregistrée automatiquement ; la remise renvoie aussi toutes les réponses.
 */
@Component({
  selector: 'app-take-test',
  imports: [DatePipe],
  templateUrl: './take-test.html',
  styleUrl: './take-test.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TakeTest {
  private api = inject(PublicTestService);
  private destroyRef = inject(DestroyRef);
  private token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  readonly typeLabels = QUESTION_TYPE_LABELS;
  view = signal<PublicTestView | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  busy = signal<'start' | 'submit' | null>(null);
  confirmSubmit = signal(false);
  announce = signal('');

  drafts = signal<Record<number, Draft>>({});
  saveStates = signal<Record<number, SaveState>>({});

  // ----- minuteur -----
  private endsAt = 0;                                  // horloge locale, recalée sur le temps restant du serveur
  private now = signal(0);
  private timerId: ReturnType<typeof setInterval> | null = null;
  private announced = new Set<number>();
  remaining = computed(() => Math.max(0, Math.round((this.endsAt - this.now()) / 1000)));
  remainingLabel = computed(() => {
    const s = this.remaining();
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  });
  lowTime = computed(() => this.remaining() <= 60);

  unanswered = computed(() => {
    const d = this.drafts();
    return (this.view()?.questions ?? []).filter(q => {
      const x = d[q.answerId];
      return !x || (x.selected.length === 0 && !x.text.trim());
    }).length;
  });

  private saves = new Subject<TestAnswerInput>();
  private firstQuestion = viewChild<ElementRef<HTMLElement>>('firstQuestion');
  private resultHeading = viewChild<ElementRef<HTMLElement>>('resultHeading');

  constructor() {
    // une file par question : la dernière saisie part après une courte pause, dans l'ordre
    this.saves.pipe(
      groupBy(a => a.answerId),
      mergeMap(group => group.pipe(debounceTime(700), concatMap(a => this.save(a)))),
      takeUntilDestroyed()
    ).subscribe();

    this.destroyRef.onDestroy(() => this.stopTimer());
    this.load();
  }

  start() {
    this.busy.set('start');
    this.error.set(null);
    this.api.start(this.token).subscribe({
      next: v => {
        this.busy.set(null);
        this.apply(v);
        setTimeout(() => this.firstQuestion()?.nativeElement.focus());
      },
      error: err => {
        this.busy.set(null);
        this.error.set(extractErrorMessage(err));
        this.load();
      }
    });
  }

  toggleOption(q: PublicTestQuestion, optionId: number, checked: boolean) {
    const current = this.drafts()[q.answerId] ?? { selected: [], text: '' };
    const selected = q.type === 'QCM_UNIQUE'
      ? (checked ? [optionId] : [])
      : (checked ? [...current.selected.filter(id => id !== optionId), optionId] : current.selected.filter(id => id !== optionId));
    this.update(q.answerId, { ...current, selected });
  }

  setText(q: PublicTestQuestion, text: string) {
    const current = this.drafts()[q.answerId] ?? { selected: [], text: '' };
    this.update(q.answerId, { ...current, text });
  }

  isChecked(q: PublicTestQuestion, optionId: number): boolean {
    return this.drafts()[q.answerId]?.selected.includes(optionId) ?? false;
  }

  textOf(q: PublicTestQuestion): string {
    return this.drafts()[q.answerId]?.text ?? '';
  }

  submit() {
    if (this.busy() === 'submit') return;
    this.busy.set('submit');
    this.error.set(null);
    this.api.submit(this.token, this.allAnswers()).subscribe({
      next: v => {
        this.busy.set(null);
        this.confirmSubmit.set(false);
        this.apply(v);
        setTimeout(() => this.resultHeading()?.nativeElement.focus());
      },
      error: err => {
        this.busy.set(null);
        this.error.set(extractErrorMessage(err));
        this.load();
      }
    });
  }

  // =================== Interne ===================

  private load() {
    this.api.view(this.token).subscribe({
      next: v => {
        this.loading.set(false);
        this.apply(v);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.view.set(null);
        this.error.set(err instanceof HttpErrorResponse && err.status === 404
          ? 'Ce lien de test est invalide ou a été annulé.'
          : extractErrorMessage(err));
      }
    });
  }

  private apply(v: PublicTestView) {
    this.view.set(v);
    if (v.status === 'COMMENCE' && v.remainingSeconds !== null) {
      // les réponses du serveur, sauf celles en cours de saisie dans cette page
      const local = this.drafts();
      const next: Record<number, Draft> = {};
      for (const q of v.questions) {
        next[q.answerId] = local[q.answerId] ?? { selected: q.selectedOptionIds, text: q.answerText ?? '' };
      }
      this.drafts.set(next);
      this.startTimer(v.remainingSeconds);
    } else {
      this.stopTimer();
    }
  }

  private update(answerId: number, draft: Draft) {
    this.drafts.update(d => ({ ...d, [answerId]: draft }));
    this.saveStates.update(s => ({ ...s, [answerId]: 'saving' }));
    this.saves.next({ answerId, selectedOptionIds: draft.selected, answerText: draft.text || null });
  }

  private save(answer: TestAnswerInput) {
    return new Promise<void>(resolve => {
      this.api.saveAnswer(this.token, answer).subscribe({
        next: () => {
          this.saveStates.update(s => ({ ...s, [answer.answerId]: 'saved' }));
          resolve();
        },
        error: (err: unknown) => {
          this.saveStates.update(s => ({ ...s, [answer.answerId]: 'error' }));
          // temps écoulé ou test remis ailleurs : on affiche l'état réel
          if (err instanceof HttpErrorResponse && err.status === 422) this.load();
          resolve();
        }
      });
    });
  }

  private allAnswers(): TestAnswerInput[] {
    return Object.entries(this.drafts()).map(([id, d]) => ({
      answerId: Number(id), selectedOptionIds: d.selected, answerText: d.text || null
    }));
  }

  private startTimer(remainingSeconds: number) {
    this.endsAt = Date.now() + remainingSeconds * 1000;
    this.now.set(Date.now());
    if (this.timerId !== null) return;
    this.timerId = setInterval(() => this.tick(), 1000);
  }

  private stopTimer() {
    if (this.timerId !== null) clearInterval(this.timerId);
    this.timerId = null;
  }

  private tick() {
    this.now.set(Date.now());
    const left = this.remaining();
    for (const mark of [300, 60]) {
      if (left <= mark && left > 0 && !this.announced.has(mark)) {
        this.announced.add(mark);
        this.announce.set(mark === 300 ? 'Il reste 5 minutes.' : 'Il reste 1 minute.');
      }
    }
    if (left === 0) {
      this.stopTimer();
      this.announce.set('Temps écoulé : vos réponses sont remises.');
      this.submit();                                  // le serveur accepte une marge de 30 s
    }
  }
}
