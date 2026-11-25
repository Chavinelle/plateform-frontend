
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  standalone: true,
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPassword {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);

  // pré-rempli depuis le lien d'activation envoyé au candidat ajouté par un recruteur
  form = this.fb.nonNullable.group({
    email: [inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]]
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);

    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/reinitialisation-mot-de-passe'], { queryParams: { email } });
      },
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
