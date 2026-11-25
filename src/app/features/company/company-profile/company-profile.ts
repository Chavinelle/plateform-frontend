import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RefDatalist } from '../../../shared/ref-datalist/ref-datalist';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import {
  COMPANY_SIZES, COMPANY_STATUS_LABELS, COMPANY_STATUS_MESSAGES,
  CompanyImageSlot, CompanyInfo, UpdateCompanyRequest
} from '../../../../core/models/company.models';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyService } from '../../../../core/services/company.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { blankToNull } from '../../../../core/utils/text';
import { Loading } from '../../../shared/loading/loading';

const URL_PATTERN = /^$|^https?:\/\/\S+$/;
const MAX_BYTES: Record<CompanyImageSlot, number> = { logo: 2 * 1024 * 1024, banner: 4 * 1024 * 1024 };

@Component({
  selector: 'app-company-profile',
  imports: [Loading, RefDatalist, ReactiveFormsModule],
  templateUrl: './company-profile.html',
  styleUrl: './company-profile.scss'
})
export class CompanyProfile implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private api = inject(CompanyService);
  private auth = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  company = signal<CompanyInfo | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  saving = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  logoUrl = signal<SafeUrl | null>(null);
  bannerUrl = signal<SafeUrl | null>(null);
  imageBusy = signal(false);
  imageError = signal<string | null>(null);
  private objectUrls: Partial<Record<CompanyImageSlot, string>> = {};

  sizes = COMPANY_SIZES;
  canEdit = computed(() => this.auth.user()?.role === 'ADMIN_ENTREPRISE');
  statusLabel = computed(() => {
    const c = this.company();
    return c ? COMPANY_STATUS_LABELS[c.status] : '';
  });
  statusMessage = computed(() => {
    const c = this.company();
    return c ? COMPANY_STATUS_MESSAGES[c.status] ?? null : null;
  });
  initials = computed(() => (this.company()?.name ?? '').trim().slice(0, 2).toUpperCase());

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    sector: ['', Validators.maxLength(100)],
    size: [''],
    country: ['', Validators.maxLength(100)],
    city: ['', Validators.maxLength(100)],
    website: ['', [Validators.pattern(URL_PATTERN), Validators.maxLength(255)]],
    description: ['', Validators.maxLength(5000)],
    coreValues: ['', Validators.maxLength(3000)],
    linkedinUrl: ['', [Validators.pattern(URL_PATTERN), Validators.maxLength(255)]],
    facebookUrl: ['', [Validators.pattern(URL_PATTERN), Validators.maxLength(255)]],
    xUrl: ['', [Validators.pattern(URL_PATTERN), Validators.maxLength(255)]]
  });

  ngOnInit() {
    this.api.getProfile().subscribe({
      next: c => {
        this.company.set(c);
        this.fillForm(c);
        if (!this.canEdit()) this.form.disable();       // lecture seule pour les non-administrateurs
        this.loading.set(false);
        if (c.hasLogo) this.loadImage('logo');
        if (c.hasBanner) this.loadImage('banner');
      },
      error: err => {
        this.loading.set(false);
        this.loadError.set(extractErrorMessage(err));
      }
    });
  }

  ngOnDestroy() {
    Object.values(this.objectUrls).forEach(url => url && URL.revokeObjectURL(url));
  }

  bad(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.touched && c.invalid;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body: UpdateCompanyRequest = {
      name: v.name.trim(),
      sector: blankToNull(v.sector),
      size: blankToNull(v.size),
      country: blankToNull(v.country),
      city: blankToNull(v.city),
      website: blankToNull(v.website),
      description: blankToNull(v.description),
      coreValues: blankToNull(v.coreValues),
      linkedinUrl: blankToNull(v.linkedinUrl),
      facebookUrl: blankToNull(v.facebookUrl),
      xUrl: blankToNull(v.xUrl)
    };

    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);
    this.api.updateProfile(body).subscribe({
      next: c => {
        this.saving.set(false);
        this.company.set(c);
        this.fillForm(c);
        this.message.set('Informations enregistrées.');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  // ---------------- Logo et bannière ----------------

  onImageSelected(slot: CompanyImageSlot, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.imageError.set(null);
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.imageError.set('Format non accepté : utilisez une image JPG ou PNG.');
      return;
    }
    if (file.size > MAX_BYTES[slot]) {
      this.imageError.set(`Image trop lourde (${MAX_BYTES[slot] / (1024 * 1024)} Mo maximum).`);
      return;
    }

    this.imageBusy.set(true);
    this.api.uploadImage(slot, file).subscribe({
      next: () => {
        this.imageBusy.set(false);
        this.loadImage(slot);
      },
      error: err => {
        this.imageBusy.set(false);
        this.imageError.set(extractErrorMessage(err));
      }
    });
  }

  removeImage(slot: CompanyImageSlot) {
    if (!confirm(slot === 'logo' ? 'Supprimer le logo ?' : 'Supprimer la bannière ?')) return;
    this.imageError.set(null);
    this.api.deleteImage(slot).subscribe({
      next: () => this.setImage(slot, null),
      error: err => this.imageError.set(extractErrorMessage(err))
    });
  }

  /** Une balise <img> n'envoie pas le jeton : on récupère l'image en "blob" puis on l'affiche via une URL locale. */
  private loadImage(slot: CompanyImageSlot) {
    this.api.getImage(slot).subscribe({
      next: blob => this.setImage(slot, blob),
      error: () => this.setImage(slot, null)
    });
  }

  private setImage(slot: CompanyImageSlot, blob: Blob | null) {
    const previous = this.objectUrls[slot];
    if (previous) URL.revokeObjectURL(previous);

    const url = blob ? URL.createObjectURL(blob) : null;
    this.objectUrls[slot] = url ?? undefined;
    const safe = url ? this.sanitizer.bypassSecurityTrustUrl(url) : null;
    (slot === 'logo' ? this.logoUrl : this.bannerUrl).set(safe);
  }

  private fillForm(c: CompanyInfo) {
    this.form.reset({
      name: c.name,
      sector: c.sector ?? '',
      size: c.size ?? '',
      country: c.country ?? '',
      city: c.city ?? '',
      website: c.website ?? '',
      description: c.description ?? '',
      coreValues: c.coreValues ?? '',
      linkedinUrl: c.linkedinUrl ?? '',
      facebookUrl: c.facebookUrl ?? '',
      xUrl: c.xUrl ?? ''
    });
  }
}
