import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import {
  APPLICATION_SOURCE_LABELS, APPLICATION_STATUS_LABELS, ApplicationDocumentView,
  RecruiterApplicationDetail, RecruiterHistoryEntry
} from '../../../../../core/models/application.models';
import { SKILL_LABELS, SkillLevel } from '../../../../../core/models/candidate.models';
import { Stage } from '../../../../../core/models/company.models';
import { JobService } from '../../../../../core/services/job.service';
import { RecruiterApplicationService } from '../../../../../core/services/recruiter-application.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { DocumentPreview } from '../document-preview/document-preview';
import { EvaluationsPanel } from '../evaluations-panel/evaluations-panel';
import { TestsPanel } from '../tests-panel/tests-panel';
import { TalentPoolAdd } from '../talent-pool-add/talent-pool-add';
import { MessageThread } from '../../../../shared/message-thread/message-thread';
import { InterviewsPanel } from '../interviews-panel/interviews-panel';
import { NotesPanel } from '../notes-panel/notes-panel';
import { StageMover } from '../stage-mover/stage-mover';
import { StarRating } from '../star-rating/star-rating';
import { TagEditor } from '../tag-editor/tag-editor';

@Component({
  selector: 'app-application-detail',
  imports: [RouterLink, DatePipe, DocumentPreview, StageMover, StarRating, TagEditor, NotesPanel, InterviewsPanel, EvaluationsPanel, TestsPanel, MessageThread, TalentPoolAdd],
  templateUrl: './application-detail.html',
  styleUrl: './application-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApplicationDetail {
  private route = inject(ActivatedRoute);
  private api = inject(RecruiterApplicationService);
  private jobApi = inject(JobService);

  a = signal<RecruiterApplicationDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  selectedDocId = signal<number | null>(null);
  stages = signal<Stage[]>([]);
  message = signal<string | null>(null);
  tagSuggestions = signal<string[]>([]);
  triageBusy = signal(false);
  triageError = signal<string | null>(null);

  /** Document affiché dans l'aperçu : celui choisi, sinon le CV. */
  selectedDoc = computed<ApplicationDocumentView | null>(() => {
    const docs = this.a()?.documents ?? [];
    return docs.find(d => d.id === this.selectedDocId())
      ?? docs.find(d => d.kind === 'CV')
      ?? docs[0]
      ?? null;
  });
  fullName = computed(() => {
    const c = this.a()?.candidate;
    return c ? `${c.firstName} ${c.lastName}` : '';
  });
  place = computed(() => {
    const c = this.a()?.candidate;
    return c ? [c.city, c.country].filter(Boolean).join(', ') : '';
  });
  hasLinks = computed(() => {
    const c = this.a()?.candidate;
    return !!c && !!(c.linkedinUrl || c.githubUrl || c.portfolioUrl);
  });

  constructor() {
    this.route.paramMap.pipe(
      tap(() => {
        this.a.set(null);
        this.error.set(null);
        this.selectedDocId.set(null);
        this.stages.set([]);
        this.tagSuggestions.set([]);
        this.message.set(null);
        this.triageError.set(null);
        this.loading.set(true);
      }),
      switchMap(pm => {
        const id = Number(pm.get('id'));
        if (!Number.isInteger(id)) return of(null);
        return this.api.get(id).pipe(
          // étapes et étiquettes ne servent que si l'on peut faire avancer la candidature
          switchMap(app => (app.canManage
            ? forkJoin({ stages: this.jobApi.getJobPipeline(app.jobId), tags: this.api.tagSuggestions() })
            : of({ stages: [] as Stage[], tags: [] as string[] }))
            .pipe(map(extra => ({ app, ...extra })))),
          catchError(err => {
            this.error.set(extractErrorMessage(err));
            return of(null);
          }));
      }),
      takeUntilDestroyed()
    ).subscribe(res => {
      this.loading.set(false);
      if (res) {
        this.a.set(res.app);
        this.stages.set(res.stages);
        this.tagSuggestions.set(res.tags);
      } else if (!this.error()) {
        this.error.set('Candidature introuvable');
      }
    });
  }

  onMoved(updated: RecruiterApplicationDetail) {
    this.a.set(updated);
    this.message.set(`Candidature déplacée vers « ${updated.stageName} ».`);
  }

  rate(rating: number | null) {
    const app = this.a();
    if (app) this.triage(this.api.rate(app.id, rating), rating === null ? 'Note retirée.' : `Note : ${rating} sur 5.`);
  }

  updateTags(tags: string[]) {
    const app = this.a();
    if (!app) return;
    this.triage(this.api.setTags(app.id, tags), 'Étiquettes enregistrées.', () => {
      // une nouvelle étiquette devient une suggestion pour les autres candidatures
      const known = new Set(this.tagSuggestions().map(t => t.toLowerCase()));
      const added = tags.filter(t => !known.has(t.toLowerCase()));
      if (added.length) this.tagSuggestions.update(list => [...list, ...added].sort((x, y) => x.localeCompare(y)));
    });
  }

  private triage(request: Observable<RecruiterApplicationDetail>, done: string, after?: () => void) {
    this.triageBusy.set(true);
    this.triageError.set(null);
    request.subscribe({
      next: updated => {
        this.triageBusy.set(false);
        this.a.set(updated);
        this.message.set(done);
        after?.();
      },
      error: err => {
        this.triageBusy.set(false);
        this.triageError.set(extractErrorMessage(err));
      }
    });
  }

  selectDoc(d: ApplicationDocumentView) {
    this.selectedDocId.set(d.id);
  }

  statusLabel(app: RecruiterApplicationDetail): string {
    return APPLICATION_STATUS_LABELS[app.status];
  }

  sourceLabel(app: RecruiterApplicationDetail): string {
    return APPLICATION_SOURCE_LABELS[app.source];
  }

  skillLabel(level: SkillLevel): string {
    return SKILL_LABELS[level];
  }

  docLabel(d: ApplicationDocumentView): string {
    return d.kind === 'CV' ? 'CV' : 'Lettre de motivation';
  }

  /** Texte d'une ligne d'historique, composé à partir des étapes et statuts. */
  historyLabel(h: RecruiterHistoryEntry): string {
    if (h.fromStatus === null && h.fromStageName === null) return 'Candidature déposée';
    if (h.toStatus === 'RETIREE') return 'Candidature retirée par le candidat';
    if (h.toStatus === 'REJETEE') return 'Candidature rejetée';
    if (h.toStatus === 'EMBAUCHEE') return 'Candidat embauché';
    if (h.fromStageName !== h.toStageName && h.toStageName) {
      return h.fromStageName ? `${h.fromStageName} → ${h.toStageName}` : `Étape « ${h.toStageName} »`;
    }
    if (h.fromStatus !== h.toStatus && h.toStatus) return `Statut : ${APPLICATION_STATUS_LABELS[h.toStatus]}`;
    return 'Mise à jour';
  }
}
