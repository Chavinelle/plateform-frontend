import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, catchError, combineLatest, switchMap, timer } from 'rxjs';
import { MAX_MESSAGE_LENGTH, MessageThread as Thread } from '../../../core/models/message.models';
import { MessageService } from '../../../core/services/message.service';
import { extractErrorMessage } from '../../../core/utils/http-error';

const POLL_MS = 30_000;

/**
 * Fil de messages d'une candidature, côté entreprise ou côté candidat.
 * Rechargé toutes les 30 secondes tant qu'il est affiché (les nouveaux messages sont annoncés).
 */
@Component({
  selector: 'app-message-thread',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './message-thread.html',
  styleUrl: './message-thread.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageThread {
  private api = inject(MessageService);
  private fb = inject(FormBuilder);

  side = input.required<'company' | 'candidate'>();
  applicationId = input.required<number>();

  readonly max = MAX_MESSAGE_LENGTH;
  thread = signal<Thread | null>(null);
  loading = signal(true);
  sending = signal(false);
  error = signal<string | null>(null);
  announce = signal('');

  form = this.fb.nonNullable.group({ body: ['', [Validators.required, Validators.maxLength(MAX_MESSAGE_LENGTH)]] });
  length = signal(0);
  messages = computed(() => this.thread()?.messages ?? []);

  private list = viewChild<ElementRef<HTMLElement>>('list');
  private tick = signal(0);

  constructor() {
    combineLatest([toObservable(this.side), toObservable(this.applicationId), toObservable(this.tick)]).pipe(
      switchMap(([side, id]) => timer(0, POLL_MS).pipe(
        switchMap(() => this.api.thread(side, id).pipe(catchError(err => {
          this.loading.set(false);
          this.error.set(extractErrorMessage(err));
          return EMPTY;
        })))
      )),
      takeUntilDestroyed()
    ).subscribe(t => this.apply(t));

    this.form.controls.body.valueChanges.pipe(takeUntilDestroyed()).subscribe(v => this.length.set(v.length));
  }

  send() {
    const body = this.form.controls.body.value.trim();
    if (!body) {
      this.error.set('Le message est vide.');
      return;
    }
    if (body.length > MAX_MESSAGE_LENGTH) {
      this.error.set(`Message trop long (${MAX_MESSAGE_LENGTH} caractères maximum).`);
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    this.api.send(this.side(), this.applicationId(), body).subscribe({
      next: t => {
        this.sending.set(false);
        this.form.reset({ body: '' });
        this.apply(t);
        this.announce.set('Message envoyé.');
      },
      error: err => {
        this.sending.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  /** Ctrl+Entrée (ou Cmd+Entrée) envoie le message. */
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.send();
    }
  }

  refresh() {
    this.tick.update(n => n + 1);
  }

  private apply(t: Thread) {
    const before = this.thread()?.messages.length;
    this.loading.set(false);
    this.thread.set(t);
    if (before !== undefined && t.messages.length > before) {
      const incoming = t.messages.slice(before).filter(m => !m.mine).length;
      if (incoming) this.announce.set(incoming > 1 ? `${incoming} nouveaux messages.` : 'Nouveau message reçu.');
    }
    if (before !== t.messages.length) {
      setTimeout(() => {
        const el = this.list()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
  }
}
