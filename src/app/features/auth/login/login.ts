import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { homeRouteFor } from '../../../../core/utils/roles';

import { AuthService } from './../../../../core/services/auth.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  needsVerification = signal(false);
  resending = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  constructor() {
    const q = this.route.snapshot.queryParamMap;
    if (q.get('verified')) this.success.set('E-mail vérifié. Vous pouvez vous connecter.');
    if (q.get('reset')) this.success.set('Mot de passe modifié. Vous pouvez vous connecter.');
    if (q.get('invited')) this.success.set('Compte créé. Vous pouvez vous connecter avec votre adresse e-mail professionnelle.');
  }

  /**
   * Compte créé mais jamais vérifié : envoie un nouveau code puis ouvre la page de saisie (adresse préremplie).
   * Si un code vient déjà d'être envoyé (délai d'une minute), on ouvre quand même la page : ce code reste valable.
   */
  resendCode() {
    const email = this.form.controls.email.value.trim();
    this.resending.set(true);
    this.auth.resendVerification(email).subscribe({
      next: () => this.openVerification(email, true),
      error: () => this.openVerification(email, false),
    });
  }

  private openVerification(email: string, sent: boolean) {
    this.resending.set(false);
    this.router.navigate(['/verification-email'], { queryParams: { email, ...(sent ? { sent: 1 } : {}) } });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.needsVerification.set(false);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: res => {
  this.loading.set(false);
  // retour vers la page demandée avant la connexion, sinon vers l'espace du rôle
  const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  const safe = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//');
  this.router.navigateByUrl(safe ? returnUrl : homeRouteFor(res.role));
  },
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
        this.needsVerification.set(
          err.status === 403 && String(err.error?.message ?? '').includes('vérifiée')
        );
      }
    });
  }
}
