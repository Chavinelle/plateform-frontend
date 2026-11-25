import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { TalentList, TalentPoolItem } from '../../../../../core/models/talent-pool.models';
import { TalentPoolService } from '../../../../../core/services/talent-pool.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

type Mode = 'edit' | 'propose' | 'remove' | null;

/** Un candidat du vivier : note, étiquettes, listes, proposition sur une offre, retrait. */
@Component({
  selector: 'app-talent-card',
  imports: [DatePipe],
  templateUrl: './talent-card.html',
  styleUrl: './talent-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TalentCard {
  private api = inject(TalentPoolService);

  item = input.required<TalentPoolItem>();
  lists = input<TalentList[]>([]);
  jobs = input<{ id: number; title: string }[]>([]);
  canManage = input(false);
  changed = output<TalentPoolItem>();
  removed = output<number>();
  info = output<string>();

  mode = signal<Mode>(null);
  busy = signal(false);
  error = signal<string | null>(null);
  note = signal('');
  tags = signal('');
  jobId = signal<number | null>(null);
  /** Listes dont le candidat ne fait pas encore partie. */
  otherLists = computed(() => this.lists().filter(l => !this.item().lists.some(x => x.id === l.id)));

  open(mode: Mode) {
    this.error.set(null);
    this.mode.set(mode);
    if (mode === 'edit') {
      this.note.set(this.item().note ?? '');
      this.tags.set(this.item().tags.join(', '));
    }
    if (mode === 'propose') this.jobId.set(this.jobs()[0]?.id ?? null);
  }

  save() {
    const tags = this.tags().split(',').map(t => t.trim()).filter(t => !!t);
    this.run(this.api.update(this.item().entryId, this.note().trim() || null, tags), r => {
      this.changed.emit(r);
      this.info.emit('Note et étiquettes enregistrées.');
    });
  }

  addToList(listId: string) {
    if (!listId) return;
    this.run(this.api.setMembership(+listId, this.item().entryId, true), r => this.changed.emit(r));
  }

  removeFromList(listId: number) {
    this.run(this.api.setMembership(listId, this.item().entryId, false), r => this.changed.emit(r));
  }

  propose() {
    const jobId = this.jobId();
    if (jobId === null) return;
    const title = this.jobs().find(j => j.id === jobId)?.title ?? '';
    this.run(this.api.propose(this.item().entryId, jobId), () =>
      this.info.emit(`${this.item().candidateName} a été proposé(e) pour « ${title} » ; il ou elle en est informé(e) par e-mail.`));
  }

  remove() {
    this.run(this.api.remove(this.item().entryId), () => {
      this.removed.emit(this.item().entryId);
      this.info.emit(`${this.item().candidateName} a été retiré(e) du vivier.`);
    });
  }

  private run<T>(request: Observable<T>, next: (value: T) => void) {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: value => {
        this.busy.set(false);
        this.mode.set(null);
        next(value);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
