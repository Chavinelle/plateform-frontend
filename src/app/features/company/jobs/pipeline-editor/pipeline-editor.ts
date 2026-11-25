import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Stage, StageKind, StageRequest } from '../../../../../core/models/company.models';
import { JobService } from '../../../../../core/services/job.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { Loading } from '../../../../shared/loading/loading';

interface StageDraft {
  id: number | null;
  name: string;
  color: string;
  kind: StageKind;
  locked: boolean;
}

const MAX_STAGES = 15;

const KIND_LABELS: Record<StageKind, string> = {
  ENTREE: 'Entrée (fixe)',
  STANDARD: '',
  EMBAUCHE: 'Embauche (fixe)',
  REJET: 'Rejet (fixe)'
};

@Component({
  selector: 'app-pipeline-editor',
  imports: [Loading, ],
  templateUrl: './pipeline-editor.html',
  styleUrl: './pipeline-editor.scss'
})
export class PipelineEditor implements OnInit {
  private api = inject(JobService);

  jobId = input<number | null>(null);
  readonly = input(false);

  items = signal<StageDraft[]>([]);
  loading = signal(true);
  saving = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);
  maxStages = MAX_STAGES;

  ngOnInit() {
    const id = this.jobId();
    const request$ = id === null ? this.api.getCompanyPipeline() : this.api.getJobPipeline(id);
    request$.subscribe({
      next: stages => {
        this.items.set(stages.map(s => this.fromServer(s)));
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  kindLabel(kind: StageKind): string {
    return KIND_LABELS[kind];
  }

  canMove(i: number, delta: number): boolean {
    const list = this.items();
    const j = i + delta;
    return j >= 0 && j < list.length && list[i].kind === 'STANDARD' && list[j].kind === 'STANDARD';
  }

  setName(i: number, name: string) {
    this.message.set(null);
    this.items.update(list => list.map((s, idx) => (idx === i ? { ...s, name } : s)));
  }

  setColor(i: number, color: string) {
    this.message.set(null);
    this.items.update(list => list.map((s, idx) => (idx === i ? { ...s, color } : s)));
  }

  move(i: number, delta: number) {
    if (!this.canMove(i, delta)) return;
    this.message.set(null);
    this.items.update(list => {
      const copy = [...list];
      [copy[i], copy[i + delta]] = [copy[i + delta], copy[i]];
      return copy;
    });
  }

  add() {
    if (this.items().length >= MAX_STAGES) return;
    this.message.set(null);
    this.items.update(list => {
      const copy = [...list];
      const hiredAt = copy.findIndex(s => s.kind === 'EMBAUCHE');
      copy.splice(hiredAt, 0, { id: null, name: 'Nouvelle étape', color: '#64748b', kind: 'STANDARD', locked: false });
      return copy;
    });
  }

  remove(i: number) {
    this.message.set(null);
    this.items.update(list => list.filter((_, idx) => idx !== i));
  }

  save() {
    const names = this.items().map(s => s.name.trim().toLowerCase());
    if (names.some(n => !n)) {
      this.error.set('Toutes les étapes doivent avoir un nom.');
      return;
    }
    if (new Set(names).size !== names.length) {
      this.error.set('Deux étapes portent le même nom.');
      return;
    }

    const payload: StageRequest[] = this.items().map(s => ({ id: s.id, name: s.name.trim(), color: s.color }));
    const id = this.jobId();

    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);
    const request$ = id === null ? this.api.saveCompanyPipeline(payload) : this.api.saveJobPipeline(id, payload);
    request$.subscribe({
      next: saved => {
        this.saving.set(false);
        this.items.set(saved.map(s => this.fromServer(s)));
        this.message.set(id === null
          ? 'Modèle enregistré. Il s\'appliquera aux nouvelles offres ; les offres existantes ne changent pas.'
          : 'Pipeline enregistré.');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  private fromServer(s: Stage): StageDraft {
    return { id: s.id, name: s.name, color: s.color, kind: s.kind, locked: s.locked };
  }
}
