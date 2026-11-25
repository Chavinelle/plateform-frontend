import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';

@Component({
  selector: 'app-verify-email',
  imports: [ReactiveFormsModule, RouterLink],
  standalone: true,
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss',
})
export class VerifyEmail implements OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  info = signal<string | null>(null);
  error = signal<string | null>(null);
  cooldown = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    // arrivée depuis la connexion après « Recevoir un nouveau code »
    const q = this.route.snapshot.queryParamMap;
    if (q.get('sent') && q.get('email')) {
      this.info.set(`Un nouveau code a été envoyé à ${q.get('email')}. Il est valable 10 minutes.`);
      this.startCooldown(60);
    }
  }

  form = this.fb.nonNullable.group({
    email: [this.route.snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  verify() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, code } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.info.set(null);

    this.auth.verifyEmail(email, code).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/login'], { queryParams: { verified: 1 } });
      },
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  resend() {
    const email = this.form.controls.email;
    if (email.invalid) {
      email.markAsTouched();
      return;
    }
    this.error.set(null);
    this.auth.resendVerification(email.value).subscribe({
      next: res => {
        this.info.set(res.message);
        this.startCooldown(60);
      },
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  private startCooldown(seconds: number) {
    clearInterval(this.timer);
    this.cooldown.set(seconds);
    this.timer = setInterval(() => {
      this.cooldown.update(v => v - 1);
      if (this.cooldown() <= 0) clearInterval(this.timer);
    }, 1000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }
}
