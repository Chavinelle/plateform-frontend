import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  APPLICATION_STATUS_LABELS, AnswerPayload, ApplicationFormData, ApplicationSummary
} from '../../../../core/models/application.models';
import { ApplicationService } from '../../../../core/services/application.service';
import { CandidateService } from '../../../../core/services/candidate.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { Loading } from '../../../shared/loading/loading';

interface AnswerState {
  text: string;
  optionIds: number[];
}

const MAX_ANSWER = 2000;
const MAX_LETTER = 5000;
const MAX_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-application-form',
  imports: [Loading, RouterLink, DatePipe],
  templateUrl: './application-form.html',
  styleUrl: './application-form.scss'
})
export class ApplicationForm implements OnInit {
  private route = inject(ActivatedRoute);
  private applications = inject(ApplicationService);
  private candidate = inject(CandidateService);
  private favorites = inject(FavoritesService);

  maxAnswer = MAX_ANSWER;
  maxLetter = MAX_LETTER;

  data = signal<ApplicationFormData | null>(null);
  loading = signal(true);
  notFound = signal(false);
  submitting = signal(false);
  uploading = signal(false);
  done = signal<ApplicationSummary | null>(null);

  error = signal<string | null>(null);
  docError = signal<string | null>(null);
  cvError = signal<string | null>(null);
  consentError = signal<string | null>(null);
  questionErrors = signal<Record<number, string>>({});

  cvId = signal<number | null>(null);
  letterId = signal<number | null>(null);
  coverLetter = signal('');
  consent = signal(false);
  answers = signal<Record<number, AnswerState>>({});

  cvs = computed(() => (this.data()?.documents ?? []).filter(d => d.docType === 'CV'));
  letters = computed(() => (this.data()?.documents ?? []).filter(d => d.docType === 'LETTRE_MOTIVATION'));

  ngOnInit() {
    const jobId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(jobId)) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }
    this.applications.getForm(jobId).subscribe({
      next: form => {
        this.data.set(form);
        const cvs = form.documents.filter(d => d.docType === 'CV');
        this.cvId.set((cvs.find(d => d.defaultDocument) ?? cvs[0])?.id ?? null);   // le CV par défaut est présélectionné
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      }
    });
  }

  statusLabel(s: ApplicationSummary): string {
    return APPLICATION_STATUS_LABELS[s.status];
  }

  // ---------------- Lecture des événements ----------------
  val(e: Event): string {
    return (e.target as HTMLInputElement | HTMLTextAreaElement).value;
  }
  chk(e: Event): boolean {
    return (e.target as HTMLInputElement).checked;
  }

  // ---------------- Réponses ----------------
  textOf(questionId: number): string {
    return this.answers()[questionId]?.text ?? '';
  }

  hasOption(questionId: number, optionId: number): boolean {
    return this.answers()[questionId]?.optionIds.includes(optionId) ?? false;
  }

  setText(questionId: number, text: string) {
    this.answers.update(a => ({ ...a, [questionId]: { text, optionIds: a[questionId]?.optionIds ?? [] } }));
    this.clearQuestionError(questionId);
  }

  pickOne(questionId: number, optionId: number) {
    this.answers.update(a => ({ ...a, [questionId]: { text: '', optionIds: [optionId] } }));
    this.clearQuestionError(questionId);
  }

  toggleOption(questionId: number, optionId: number, checked: boolean) {
    this.answers.update(a => {
      const current = a[questionId]?.optionIds ?? [];
      const optionIds = checked ? [...new Set([...current, optionId])] : current.filter(id => id !== optionId);
      return { ...a, [questionId]: { text: '', optionIds } };
    });
    this.clearQuestionError(questionId);
  }

  private clearQuestionError(questionId: number) {
    this.questionErrors.update(e => {
      const { [questionId]: _removed, ...rest } = e;
      return rest;
    });
  }

  // ---------------- Envoi de documents depuis la page ----------------
  onUpload(event: Event, type: 'CV' | 'LETTRE_MOTIVATION') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.docError.set(null);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'docx'].includes(ext)) {
      this.docError.set('Format non accepté : PDF ou DOCX uniquement.');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.docError.set('Fichier trop volumineux (5 Mo maximum).');
      return;
    }

    this.uploading.set(true);
    this.candidate.uploadDocument(file, type).subscribe({
      next: doc => {
        this.uploading.set(false);
        this.data.update(f => (f ? { ...f, documents: [doc, ...f.documents] } : f));
        if (type === 'CV') {
          this.cvId.set(doc.id);
          this.cvError.set(null);
        } else {
          this.letterId.set(doc.id);
        }
      },
      error: err => {
        this.uploading.set(false);
        this.docError.set(extractErrorMessage(err));
      }
    });
  }

  // ---------------- Envoi de la candidature ----------------
    submit() {
    const f = this.data();
    if (!f || !this.validate(f)) return;

    const answers: AnswerPayload[] = f.questions.flatMap((q): AnswerPayload[] => {
      const a = this.answers()[q.id];
      if (q.type === 'TEXTE' || q.type === 'OUI_NON') {
        const text = (a?.text ?? '').trim();
        return text ? [{ questionId: q.id, text }] : [];
      }
      const optionIds = a?.optionIds ?? [];
      return optionIds.length ? [{ questionId: q.id, optionIds }] : [];
    });

    this.submitting.set(true);
    this.error.set(null);
    this.applications.apply(f.jobId, {
      cvDocumentId: this.cvId(),
      coverLetterDocumentId: this.letterId(),
      coverLetter: this.coverLetter().trim() || null,
      answers,
      consent: this.consent()
    }).subscribe({
      next: summary => {
        this.submitting.set(false);
        this.favorites.markApplied(f.jobId);      // « Déjà postulé » apparaît partout, sans rechargement
        this.done.set(summary);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: err => {
        this.submitting.set(false);
        if (err.status === 409) {
          // candidature déjà déposée (autre onglet, double clic) : l'écran passe dans l'état « déjà postulé »
          this.data.update(form => (form ? { ...form, alreadyApplied: true } : form));
        } else if (err.status === 404) {
          this.notFound.set(true);
        } else {
          this.error.set(extractErrorMessage(err));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
  }
  /** Contrôles de confort : le serveur refait toutes les vérifications. */
  private validate(f: ApplicationFormData): boolean {
    let valid = true;
    this.error.set(null);
    this.cvError.set(null);
    this.consentError.set(null);

    if (this.cvId() === null) {
      this.cvError.set('Choisissez ou ajoutez un CV.');
      valid = false;
    }
    if (this.coverLetter().length > MAX_LETTER) {
      this.error.set(`La lettre est trop longue (${MAX_LETTER} caractères maximum).`);
      valid = false;
    }

    const errors: Record<number, string> = {};
    for (const q of f.questions) {
      const a = this.answers()[q.id];
      const answered = q.type === 'TEXTE' || q.type === 'OUI_NON'
        ? !!a?.text.trim()
        : (a?.optionIds.length ?? 0) > 0;
      if (q.required && !answered) errors[q.id] = 'Cette réponse est obligatoire.';
    }
    this.questionErrors.set(errors);
    if (Object.keys(errors).length) valid = false;

    if (!this.consent()) {
      this.consentError.set('Vous devez accepter le traitement de vos données pour postuler.');
      valid = false;
    }

    if (!valid) {
      this.error.set(this.error() ?? 'Veuillez corriger les champs signalés.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return valid;
  }
}
