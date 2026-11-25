import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InvitationPreview, roleLabel } from '../../../../core/models/company.models';
import { AuthService } from '../../../../core/services/auth.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { PASSWORD_HINT, PASSWORD_PATTERN } from '../../../../core/utils/validators';

import { PasswordRules } from '../../../shared/password-rules/password-rules';
@Component({
  selector: 'app-accept-invitation',
  imports: [ReactiveFormsModule, RouterLink, PasswordRules],
  templateUrl: './accept-invitation.html',
  styleUrl: './accept-invitation.scss'
})
export class AcceptInvitation implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);

  private token = this.route.snapshot.queryParamMap.get('token') ?? '';

  loading = signal(true);
  invalid = signal<string | null>(null);
  preview = signal<InvitationPreview | null>(null);
  submitting = signal(false);
  error = signal<string | null>(null);

  roleLabel = roleLabel;
  passwordHint = PASSWORD_HINT;

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]]
  });

  ngOnInit() {
    if (!this.token) {
      this.loading.set(false);
      this.invalid.set('Lien d\'invitation incomplet.');
      return;
    }
    this.auth.getInvitation(this.token).subscribe({
      next: p => {
        this.preview.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.invalid.set('Invitation invalide ou expirée.');
      }
    });
  }

  bad(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.touched && c.invalid;
  }

  logout() {
    this.auth.logout();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);

    this.auth.acceptInvitation({
      token: this.token,
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      password: v.password
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/login'], { queryParams: { invited: 1 } });
      },
      error: err => {
        this.submitting.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
