import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, catchError, forkJoin, of, startWith, switchMap, tap } from 'rxjs';
import { PersonRef } from '../../../../../core/models/company.models';
import {
  INTERVIEW_DURATIONS, INTERVIEW_RESPONSE_LABELS, INTERVIEW_STATUS_LABELS, INTERVIEW_TYPE_LABELS,
  InterviewRequest, InterviewType, InterviewView
} from '../../../../../core/models/interview.models';
import { AuthService } from '../../../../../core/services/auth.service';
import { InterviewService } from '../../../../../core/services/interview.service';
import { parseLocal } from '../../../../../core/utils/calendar';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { InterviewReports } from '../interview-reports/interview-reports';

/**
 * Entretiens d'une candidature : liste, planification, report et annulation.
 * Les conflits d'horaire (RG9) et les modifications simultanées (409) sont vérifiés par le serveur.
 */
@Component({
  selector: 'app-interviews-panel',
  imports: [DatePipe, ReactiveFormsModule, InterviewReports],
  templateUrl: './interviews-panel.html',
  styleUrl: './interviews-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewsPanel {
  private api = inject(InterviewService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  applicationId = input.required<number>();
  /** RH / recruteur, candidature ni retirée ni rejetée. */
  canPlan = input(false);
  /** RH / recruteur (pas manager) : peut clôturer n'importe quel entretien, même sur une candidature rejetée. */
  canManage = input(false);
  private me = computed(() => this.auth.user()?.userId);
  closing = signal<number | null>(null);

  interviews = signal<InterviewView[]>([]);
  people = signal<PersonRef[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  message = signal<string | null>(null);

  // ---- planification ou report (même formulaire) ----
  formOpen = signal(false);
  /** Entretien en cours de report ; null = nouvel entretien. */
  editing = signal<InterviewView | null>(null);
  saving = signal(false);
  formError = signal<string | null>(null);
  participantIds = signal<ReadonlySet<number>>(new Set());
  minStart = signal('');

  // ---- annulation ----
  cancellingId = signal<number | null>(null);
  cancelError = signal<string | null>(null);
  cancelReason = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(1000)] });
  cancelMessage = new FormControl('', { nonNullable: true, validators: Validators.maxLength(2000) });

  readonly typeLabels = INTERVIEW_TYPE_LABELS;
  readonly statusLabels = INTERVIEW_STATUS_LABELS;
  readonly responseLabels = INTERVIEW_RESPONSE_LABELS;
  readonly types = (Object.keys(INTERVIEW_TYPE_LABELS) as InterviewType[])
    .map(value => ({ value, label: INTERVIEW_TYPE_LABELS[value] }));
  readonly durations = INTERVIEW_DURATIONS.map(value => ({ value, label: durationLabel(value) }));
  readonly durationLabel = durationLabel;
  readonly isActive = isActive;

  form = this.fb.nonNullable.group({
    type: ['VISIO' as InterviewType, Validators.required],
    startsAt: ['', Validators.required],
    durationMinutes: [60, Validators.required],
    location: ['', Validators.maxLength(255)],
    meetingUrl: ['', [Validators.maxLength(500), Validators.pattern(/^https?:\/\/\S+$/)]],
    candidateMessage: ['', Validators.maxLength(2000)]
  });

  type = toSignal(this.form.controls.type.valueChanges.pipe(startWith(this.form.controls.type.value)),
    { requireSync: true });

  /** À venir (proposés, confirmés, reportés) puis passés ou annulés ; les groupes vides sont masqués. */
  groups = computed(() => [
    { title: 'À venir ou à clôturer', done: false, items: this.interviews().filter(isActive) },
    { title: 'Passés ou annulés', done: true, items: this.interviews().filter(i => !isActive(i)) }
  ].filter(g => g.items.length > 0));

  private firstField = viewChild<ElementRef<HTMLSelectElement>>('firstField');
  private openButton = viewChild<ElementRef<HTMLButtonElement>>('openButton');
  private cancelField = viewChild<ElementRef<HTMLTextAreaElement>>('cancelField');

  constructor() {
    toObservable(this.applicationId).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
        this.formOpen.set(false);
        this.cancellingId.set(null);
      }),
      switchMap(id => forkJoin({
        interviews: this.api.list(id),
        people: this.api.participants(id).pipe(catchError(() => of([] as PersonRef[])))
      }).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of({ interviews: [] as InterviewView[], people: [] as PersonRef[] });
      }))),
      takeUntilDestroyed()
    ).subscribe(res => {
      this.loading.set(false);
      this.interviews.set(res.interviews);
      this.people.set(res.people);
    });
  }

  names(i: InterviewView): string {
    return i.participants.map(p => p.name).join(', ');
  }

  // =================== Issue et compte rendu (6.8) ===================

  isParticipant(i: InterviewView): boolean {
    return i.participants.some(p => p.id === this.me());
  }

  /** Entretien actif dont l'heure est passée : un RH ou un participant indique s'il a eu lieu. */
  canClose(i: InterviewView): boolean {
    return isActive(i) && parseLocal(i.startsAt) <= new Date() && (this.canManage() || this.isParticipant(i));
  }

  setOutcome(i: InterviewView, outcome: 'REALISE' | 'ABSENT') {
    this.closing.set(i.id);
    this.message.set(null);
    this.error.set(null);
    this.api.setOutcome(this.applicationId(), i.id, i.version, outcome).subscribe({
      next: saved => {
        this.closing.set(null);
        this.upsert(saved);
        this.message.set(outcome === 'REALISE'
          ? 'Entretien marqué comme réalisé. Les participants peuvent rédiger leur compte rendu.'
          : 'Candidat marqué absent.');
      },
      error: err => {
        this.closing.set(null);
        this.message.set(extractErrorMessage(err));
        this.refreshAfterConflict(err, i.id, () => undefined);
      }
    });
  }

  // =================== Planifier / reporter ===================

  openForm(toReschedule: InterviewView | null = null) {
    this.cancellingId.set(null);
    this.formError.set(null);
    this.message.set(null);
    this.minStart.set(toLocalInput(new Date()));
    this.editing.set(toReschedule);
    if (toReschedule) {
      this.form.reset({
        type: toReschedule.type,
        startsAt: '',
        durationMinutes: toReschedule.durationMinutes,
        location: toReschedule.location ?? '',
        meetingUrl: toReschedule.meetingUrl ?? '',
        candidateMessage: toReschedule.candidateMessage ?? ''
      });
      this.participantIds.set(new Set(toReschedule.participants.map(p => p.id)));
    } else {
      this.form.reset();
      // par défaut, la personne qui planifie participe à l'entretien
      const me = this.auth.user()?.userId;
      this.participantIds.set(new Set(me !== undefined && this.people().some(p => p.id === me) ? [me] : []));
    }
    this.formOpen.set(true);
    setTimeout(() => this.firstField()?.nativeElement.focus());
  }

  /** Reprend le créneau proposé par le candidat (6.4). */
  useProposedSlot() {
    const proposed = this.editing()?.candidateProposedAt;
    if (proposed) this.form.controls.startsAt.setValue(proposed.slice(0, 16));
  }

  closeForm() {
    this.formOpen.set(false);
    this.editing.set(null);
    setTimeout(() => this.openButton()?.nativeElement.focus());
  }

  toggleParticipant(id: number, checked: boolean) {
    this.participantIds.update(set => {
      const next = new Set(set);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  submit() {
    const v = this.form.getRawValue();
    const missingPlace = (v.type === 'VISIO' && !v.meetingUrl.trim()) || (v.type === 'PRESENTIEL' && !v.location.trim());
    if (this.form.invalid || missingPlace || this.participantIds().size === 0) {
      this.form.markAllAsTouched();
      this.formError.set(this.participantIds().size === 0
        ? 'Ajoutez au moins un participant.'
        : missingPlace
          ? (v.type === 'VISIO' ? 'Indiquez le lien de la visioconférence.' : "Indiquez le lieu de l'entretien.")
          : 'Corrigez les champs signalés.');
      return;
    }
    const body: InterviewRequest = {
      type: v.type,
      startsAt: v.startsAt,
      durationMinutes: Number(v.durationMinutes),
      location: v.type === 'VISIO' ? null : blankToNull(v.location),
      meetingUrl: v.type === 'VISIO' ? blankToNull(v.meetingUrl) : null,
      candidateMessage: blankToNull(v.candidateMessage),
      participantIds: [...this.participantIds()]
    };
    const editing = this.editing();
    const request$: Observable<InterviewView> = editing
      ? this.api.reschedule(this.applicationId(), editing.id, { ...body, version: editing.version })
      : this.api.create(this.applicationId(), body);

    this.saving.set(true);
    this.formError.set(null);
    request$.subscribe({
      next: saved => {
        this.saving.set(false);
        this.upsert(saved);
        this.message.set(editing
          ? 'Entretien reporté. Le candidat et les participants ont été prévenus.'
          : 'Entretien planifié. Les invitations ont été envoyées.');
        this.closeForm();
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(extractErrorMessage(err));
        if (editing) this.refreshAfterConflict(err, editing.id, () => this.closeForm());
      }
    });
  }

  // =================== Annuler ===================

  openCancel(i: InterviewView) {
    this.formOpen.set(false);
    this.cancelReason.reset();
    this.cancelMessage.reset();
    this.cancelError.set(null);
    this.message.set(null);
    this.cancellingId.set(i.id);
    setTimeout(() => this.cancelField()?.nativeElement.focus());
  }

  closeCancel() {
    this.cancellingId.set(null);
  }

  confirmCancel(i: InterviewView) {
    if (this.cancelReason.invalid || this.cancelMessage.invalid) {
      this.cancelReason.markAsTouched();
      this.cancelError.set(this.cancelReason.invalid ? "Indiquez le motif de l'annulation." : 'Message trop long.');
      return;
    }
    this.saving.set(true);
    this.cancelError.set(null);
    this.api.cancel(this.applicationId(), i.id, {
      version: i.version,
      reason: this.cancelReason.value.trim(),
      candidateMessage: blankToNull(this.cancelMessage.value)
    }).subscribe({
      next: saved => {
        this.saving.set(false);
        this.upsert(saved);
        this.cancellingId.set(null);
        this.message.set('Entretien annulé. Le candidat et les participants ont été prévenus.');
      },
      error: err => {
        this.saving.set(false);
        this.cancelError.set(extractErrorMessage(err));
        this.refreshAfterConflict(err, i.id, () => this.cancellingId.set(null));
      }
    });
  }

  // =================== Outils ===================

  private upsert(saved: InterviewView) {
    this.interviews.update(list => [...list.filter(x => x.id !== saved.id), saved]
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
  }

  /**
   * 409 : soit un conflit d'horaire (RG9 : le formulaire reste ouvert pour choisir un autre créneau),
   * soit l'entretien a changé entre-temps (réponse du candidat…) : la liste est rechargée et le formulaire fermé.
   */
  private refreshAfterConflict(err: unknown, interviewId: number, close: () => void) {
    if (!(err instanceof HttpErrorResponse) || err.status !== 409) return;
    const seen = this.interviews().find(x => x.id === interviewId)?.version;
    this.api.list(this.applicationId()).subscribe(list => {
      this.interviews.set(list);
      const current = list.find(x => x.id === interviewId);
      if (current && current.version !== seen) {
        close();
        this.message.set("L'entretien a changé entre-temps : la liste a été mise à jour. Vérifiez avant de recommencer.");
      }
    });
  }
}

function isActive(i: InterviewView): boolean {
  return i.status === 'PROPOSE' || i.status === 'CONFIRME' || i.status === 'REPORTE';
}

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

/** Date au format attendu par un champ datetime-local (heure locale, à la minute). */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function blankToNull(value: string): string | null {
  const v = value.trim();
  return v === '' ? null : v;
}
