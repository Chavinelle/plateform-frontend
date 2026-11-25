import { Component, inject, signal } from '@angular/core';
import { RefDatalist } from '../../../shared/ref-datalist/ref-datalist';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from './../../../../core/services/auth.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { PASSWORD_HINT, PASSWORD_PATTERN } from '../../../../core/utils/validators';

import { PasswordRules } from '../../../shared/password-rules/password-rules';
import { NavIcon } from '../../../layout/nav-icon/nav-icon';

type AccountType = 'candidat' | 'entreprise';

@Component({
  selector: 'app-register',
  imports: [RefDatalist, ReactiveFormsModule, RouterLink, PasswordRules, NavIcon],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})

export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  /** Type de compte ; « ?type=entreprise » dans l'adresse ouvre directement le formulaire entreprise. */
  mode = signal<AccountType>(inject(ActivatedRoute).snapshot.queryParamMap.get('type') === 'entreprise' ? 'entreprise' : 'candidat');
  loading = signal(false);
  error = signal<string | null>(null);
  passwordHint = PASSWORD_HINT;

  candidateForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    acceptTerms: [false, Validators.requiredTrue]
  });

  companyForm = this.fb.nonNullable.group({
    companyName: ['', Validators.required],
    sector: [''],
    size: [''],
    country: [''],
    website: [''],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    acceptTerms: [false, Validators.requiredTrue]
  });

  bad(c: AbstractControl): boolean {
    return c.touched && c.invalid;
  }

  submitCandidate() {
    if (this.candidateForm.invalid) {
      this.candidateForm.markAllAsTouched();
      return;
    }
    const value = this.candidateForm.getRawValue();
    this.run(this.auth.registerCandidate(value), value.email);
  }

  submitCompany() {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }
    const v = this.companyForm.getRawValue();
    this.run(this.auth.registerCompany({
      ...v,
      sector: v.sector || undefined,
      size: v.size || undefined,
      country: v.country || undefined,
      website: v.website || undefined
    }), v.email);
  }

  /** Adresse refusée car déjà inscrite (propose de confirmer ce compte). */
  existingEmail = signal<string | null>(null);

  selectMode(m: AccountType) {
    this.mode.set(m);
    this.error.set(null);
    this.existingEmail.set(null);
  }

  private run(request$: ReturnType<AuthService['registerCandidate']>, email: string) {
    this.loading.set(true);
    this.error.set(null);
    this.existingEmail.set(null);
    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/verification-email'], { queryParams: { email } });
      },
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
        // adresse déjà inscrite : peut-être un compte jamais confirmé
        this.existingEmail.set(err.status === 409 ? email : null);
      }
    });
  }
}
