
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RefDatalist } from '../../../shared/ref-datalist/ref-datalist';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AuthService } from '../../../../core/services/auth.service';
import { CandidateService } from '../../../../core/services/candidate.service';
import { CONTRACT_LABELS, CandidateProfile, ContractType, UpdateProfileRequest } from '../../../../core/models/candidate.models';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { SkillsSection } from './sections/skills-section/skills-section';
import { LanguagesSection } from './sections/languages-section/languages-section';
import { ExperiencesSection } from './sections/experiences-section/experiences-section';
import { EducationsSection } from './sections/educations-section/educations-section';
import { DocumentsSection } from './sections/documents-section/documents-section';
import { CompletionCard } from './completion-card/completion-card';
import { VisibilityCard } from './visibility-card/visibility-card';

const PHONE_PATTERN = /^$|^[+0-9 ().-]{6,30}$/;
const URL_PATTERN = /^$|^https?:\/\/\S+$/;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const blankToNull = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
};

import { DeleteAccount } from './delete-account/delete-account';
@Component({
  selector: 'app-profile',
  imports: [RefDatalist, ReactiveFormsModule, EducationsSection, ExperiencesSection, LanguagesSection, SkillsSection, DocumentsSection, CompletionCard, VisibilityCard, DeleteAccount],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private api = inject(CandidateService);
  private auth = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  profile = signal<CandidateProfile | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  saving = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  photoUrl = signal<SafeUrl | null>(null);
  photoBusy = signal(false);
  photoError = signal<string | null>(null);
  private objectUrl: string | null = null;

  today = new Date().toISOString().split('T')[0];
  contractTypes = (Object.keys(CONTRACT_LABELS) as ContractType[])
    .map(value => ({ value, label: CONTRACT_LABELS[value] }));

  initials = computed(() => {
    const p = this.profile();
    return p ? `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase() : '';
  });

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    phone: ['', Validators.pattern(PHONE_PATTERN)],
    city: ['', Validators.maxLength(100)],
    country: ['', Validators.maxLength(100)],
    birthDate: [''],
    headline: ['', Validators.maxLength(150)],
    summary: ['', Validators.maxLength(3000)],
    linkedinUrl: ['', [Validators.pattern(URL_PATTERN), Validators.maxLength(255)]],
    githubUrl: ['', [Validators.pattern(URL_PATTERN), Validators.maxLength(255)]],
    portfolioUrl: ['', [Validators.pattern(URL_PATTERN), Validators.maxLength(255)]],
    desiredContractType: ['' as ContractType | ''],
    desiredLocation: ['', Validators.maxLength(150)],
    mobile: [false],
    expectedSalary: this.fb.control<number | null>(null, Validators.min(0))
  });

  ngOnInit() {
    this.api.getProfile().subscribe({
      next: p => {
        this.profile.set(p);
        this.fillForm(p);
        this.loading.set(false);
        if (p.hasPhoto) this.loadPhoto();
      },
      error: err => {
        this.loading.set(false);
        this.loadError.set(extractErrorMessage(err));
      }
    });
  }

  ngOnDestroy() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

  bad(name: keyof typeof this.form.controls): boolean {
    const c: AbstractControl = this.form.controls[name];
    return c.touched && c.invalid;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body: UpdateProfileRequest = {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      phone: blankToNull(v.phone),
      city: blankToNull(v.city),
      country: blankToNull(v.country),
      headline: blankToNull(v.headline),
      summary: blankToNull(v.summary),
      birthDate: v.birthDate || null,
      linkedinUrl: blankToNull(v.linkedinUrl),
      githubUrl: blankToNull(v.githubUrl),
      portfolioUrl: blankToNull(v.portfolioUrl),
      desiredContractType: v.desiredContractType || null,
      desiredLocation: blankToNull(v.desiredLocation),
      mobile: v.mobile,
      expectedSalary: v.expectedSalary
    };

    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);

    this.api.updateProfile(body).subscribe({
      next: p => {
        this.saving.set(false);
        this.profile.set(p);
        this.fillForm(p);
        this.auth.updateStoredUser(p.firstName, p.lastName);   // met à jour le nom dans la barre de navigation
        this.message.set('Profil enregistré.');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  // ---------------- Photo ----------------

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';                       // permet de rechoisir le même fichier
    if (!file) return;

    this.photoError.set(null);
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.photoError.set('Format non accepté : utilisez une image JPG ou PNG.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      this.photoError.set('Photo trop lourde (2 Mo maximum).');
      return;
    }

    this.photoBusy.set(true);
    this.api.uploadPhoto(file).subscribe({
      next: () => {
        this.photoBusy.set(false);
        this.profile.update(p => (p ? { ...p, hasPhoto: true } : p));
        this.loadPhoto();
      },
      error: err => {
        this.photoBusy.set(false);
        this.photoError.set(extractErrorMessage(err));
      }
    });
  }

  removePhoto() {
    if (!confirm('Supprimer votre photo de profil ?')) return;
    this.photoError.set(null);
    this.api.deletePhoto().subscribe({
      next: () => {
        this.profile.update(p => (p ? { ...p, hasPhoto: false } : p));
        this.setPhoto(null);
      },
      error: err => this.photoError.set(extractErrorMessage(err))
    });
  }

  private loadPhoto() {
    this.api.getPhoto().subscribe({
      next: blob => this.setPhoto(blob),
      error: () => this.setPhoto(null)
    });
  }

  /** Une balise <img> n'envoie pas le jeton : on récupère l'image en "blob" et on l'affiche via une URL locale. */
  private setPhoto(blob: Blob | null) {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = blob ? URL.createObjectURL(blob) : null;
    this.photoUrl.set(this.objectUrl ? this.sanitizer.bypassSecurityTrustUrl(this.objectUrl) : null);
  }

  private fillForm(p: CandidateProfile) {
    this.form.reset({
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone ?? '',
      city: p.city ?? '',
      country: p.country ?? '',
      birthDate: p.birthDate ?? '',
      headline: p.headline ?? '',
      summary: p.summary ?? '',
      linkedinUrl: p.linkedinUrl ?? '',
      githubUrl: p.githubUrl ?? '',
      portfolioUrl: p.portfolioUrl ?? '',
      desiredContractType: p.desiredContractType ?? '',
      desiredLocation: p.desiredLocation ?? '',
      mobile: p.mobile,
      expectedSalary: p.expectedSalary
    });
  }
}
