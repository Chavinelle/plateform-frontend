import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { PageResponse } from '../../../../core/models/company.models';
import { TalentList, TalentPoolItem } from '../../../../core/models/talent-pool.models';
import { AuthService } from '../../../../core/services/auth.service';
import { JobService } from '../../../../core/services/job.service';
import { TalentPoolService } from '../../../../core/services/talent-pool.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { RefDatalist } from '../../../shared/ref-datalist/ref-datalist';
import { TalentCard } from './talent-card/talent-card';

/** Vivier de talents de l'entreprise : recherche, listes nommées, proposition sur une offre. */
@Component({
  selector: 'app-talent-pool',
  imports: [TalentCard, RefDatalist],
  templateUrl: './talent-pool.html',
  styleUrl: './talent-pool.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TalentPool {
  private api = inject(TalentPoolService);
  private jobApi = inject(JobService);
  private auth = inject(AuthService);

  /** Un manager consulte (le serveur le vérifie aussi). */
  canManage = computed(() => this.auth.user()?.role !== 'MANAGER');
  q = signal('');
  skill = signal('');
  city = signal('');
  tag = signal('');
  listId = signal<number | null>(null);
  page = signal(0);

  result = signal<PageResponse<TalentPoolItem> | null>(null);
  lists = signal<TalentList[]>([]);
  tagOptions = signal<string[]>([]);
  jobs = signal<{ id: number; title: string }[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  newList = signal('');
  private tick = signal(0);

  constructor() {
    this.api.lists().subscribe({ next: l => this.lists.set(l), error: () => undefined });
    this.api.tags().subscribe({ next: t => this.tagOptions.set(t), error: () => undefined });
    this.jobApi.search({ status: 'PUBLIEE', page: 0, size: 50 }).subscribe({
      next: p => this.jobs.set(p.content.map(j => ({ id: j.id, title: j.title }))), error: () => undefined
    });

    toObservable(computed(() => ({
      q: this.q(), skill: this.skill(), city: this.city(), tag: this.tag(), listId: this.listId(), page: this.page(), t: this.tick()
    }))).pipe(
      debounceTime(250),
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(query => this.api.search(query).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of(null);
      }))),
      takeUntilDestroyed()
    ).subscribe(r => {
      this.loading.set(false);
      if (r) this.result.set(r);
    });
  }

  set(field: 'q' | 'skill' | 'city' | 'tag', value: string) {
    this[field].set(value);
    this.page.set(0);
  }

  setList(value: string) {
    this.listId.set(value ? +value : null);
    this.page.set(0);
  }

  createList() {
    const name = this.newList().trim();
    if (!name) return;
    this.api.createList(name).subscribe({
      next: l => {
        this.lists.set(l);
        this.newList.set('');
        this.message.set(`Liste « ${name} » créée.`);
      },
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  deleteList(l: TalentList) {
    this.api.deleteList(l.id).subscribe({
      next: lists => {
        this.lists.set(lists);
        if (this.listId() === l.id) this.listId.set(null);
        this.message.set(`Liste « ${l.name} » supprimée (les candidats restent dans le vivier).`);
        this.tick.update(n => n + 1);
      },
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  onChanged(item: TalentPoolItem) {
    this.result.update(r => r && { ...r, content: r.content.map(x => (x.entryId === item.entryId ? item : x)) });
    this.api.lists().subscribe({ next: l => this.lists.set(l), error: () => undefined });
  }

  onRemoved(entryId: number) {
    this.result.update(r => r && { ...r, content: r.content.filter(x => x.entryId !== entryId), totalElements: r.totalElements - 1 });
    this.api.lists().subscribe({ next: l => this.lists.set(l), error: () => undefined });
  }
}
