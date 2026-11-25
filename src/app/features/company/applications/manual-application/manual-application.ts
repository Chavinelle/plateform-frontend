import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RefDatalist } from '../../../../shared/ref-datalist/ref-datalist';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, startWith, switchMap } from 'rxjs';
import {
  APPLICATION_SOURCE_LABELS, ApplicationSource, MANUAL_SOURCES, ManualApplicationResponse
} from '../../../../../core/models/application.models';
import { JobDetail } from '../../../../../core/models/company.models';
import { JobService } from '../../../../../core/services/job.service';
import { RecruiterApplicationService } from '../../../../../core/services/recruiter-application.service';
import { formatSize } from '../../../../../core/utils/format';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

const MAX_CV_BYTES = 5 * 1024 * 1024;
const CV_EXTENSIONS = ['pdf', 'docx'];

/**
 * Ajout manuel d'un candidat (cooptation, candidature papier…).
 * Si l'adresse e-mail correspond déjà à un compte candidat, le serveur y rattache la candidature.
 */
@Component({
  selector: 'app-manual-application',
  imports: [RefDatalist, ReactiveFormsModule, RouterLink],
  templateUrl: './manual-application.html',
  styleUrl: './manual-application.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManualApplication {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private jobApi = inject(JobService);
  private api = inject(RecruiterApplicationService);

  job = signal<JobDetail | null>(null);
  notFound = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  result = signal<ManualApplicationResponse | null>(null);

  cv = signal<File | null>(null);
  cvError = signal<string | null>(null);
  cvSize = computed(() => {
    const file = this.cv();
    return file ? formatSize(file.size) : '';
  });

  sources = MANUAL_SOURCES.map(value => ({ value, label: APPLICATION_SOURCE_LABELS[value] }));

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    phone: ['', Validators.maxLength(30)],
    city: ['', Validators.maxLength(100)],
    country: ['', Validators.maxLength(100)],
    headline: ['', Validators.maxLength(150)],
    source: ['COOPTATION' as ApplicationSource, Validators.required],
    referredBy: ['', Validators.maxLength(150)],
    comment: ['', Validators.maxLength(4000)],
    consent: [false, Validators.requiredTrue]
  });

  private source = toSignal(this.form.controls.source.valueChanges.pipe(startWith(this.form.controls.source.value)),
    { requireSync: true });
  isCooptation = computed(() => this.source() === 'COOPTATION');

  private cvInput = viewChild<ElementRef<HTMLInputElement>>('cvInput');
  private resultHeading = viewChild<ElementRef<HTMLElement>>('resultHeading');

  constructor() {
    this.route.paramMap.pipe(
      switchMap(pm => {
        const id = Number(pm.get('id'));
        return Number.isInteger(id) ? this.jobApi.get(id).pipe(catchError(() => of(null))) : of(null);
      }),
      takeUntilDestroyed()
    ).subscribe(job => {
      this.job.set(job);
      this.notFound.set(job === null);
    });
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  onCvSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.cvError.set(null);
    if (!file) {
      this.cv.set(null);
      return;
    }
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!CV_EXTENSIONS.includes(extension)) {
      this.cvError.set('Format non accepté : PDF ou DOCX uniquement.');
    } else if (file.size > MAX_CV_BYTES) {
      this.cvError.set('Fichier trop volumineux (5 Mo maximum).');
    }
    this.cv.set(this.cvError() ? null : file);
  }

  clearCv() {
    this.cv.set(null);
    this.cvError.set(null);
    const input = this.cvInput()?.nativeElement;
    if (input) input.value = '';
  }

  submit() {
    const job = this.job();
    if (!job) return;
    if (this.form.invalid || this.cvError()) {
      this.form.markAllAsTouched();
      this.error.set('Corrigez les champs signalés.');
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.api.addManual(job.id, {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      email: v.email.trim(),
      phone: blankToNull(v.phone),
      city: blankToNull(v.city),
      country: blankToNull(v.country),
      headline: blankToNull(v.headline),
      source: v.source,
      referredBy: v.source === 'COOPTATION' ? blankToNull(v.referredBy) : null,
      comment: blankToNull(v.comment),
      consent: v.consent
    }, this.cv()).subscribe({
      next: res => {
        this.saving.set(false);
        this.result.set(res);
        // le formulaire disparaît : on place le focus sur le message de confirmation
        setTimeout(() => this.resultHeading()?.nativeElement.focus());
      },
      error: err => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  /** Repart d'un formulaire vide pour saisir un autre candidat sur la même offre. */
  addAnother() {
    this.result.set(null);
    this.error.set(null);
    this.form.reset();
    this.clearCv();
  }
}

function blankToNull(value: string): string | null {
  const v = value.trim();
  return v === '' ? null : v;
}
