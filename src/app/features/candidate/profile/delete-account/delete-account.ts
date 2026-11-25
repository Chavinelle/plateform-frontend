import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, Injector, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';
import { CandidateService } from '../../../../../core/services/candidate.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

const CONFIRMATION = 'SUPPRIMER';

/**
 * Droit à l'effacement (11.8) : suppression définitive du compte par le candidat.
 * Deux garde-fous : le mot de passe, et la saisie de « SUPPRIMER ».
 */
@Component({
  selector: 'app-delete-account',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card danger-zone" aria-labelledby="delete-title">
      <h2 id="delete-title">Supprimer mon compte</h2>
      <p>La suppression est <strong>définitive</strong> :</p>
      <ul>
        <li>votre profil, vos documents, vos favoris et vos alertes sont supprimés ;</li>
        <li>vos candidatures en cours sont retirées et vos entretiens prévus annulés ;</li>
        <li>les entreprises ne voient plus qu'une candidature anonyme « Candidat supprimé », sans lettre, documents ni messages.</li>
      </ul>
      <p class="muted">Détails dans la <a routerLink="/confidentialite">politique de confidentialité</a>.
        Un e-mail de confirmation vous sera envoyé une dernière fois.</p>

      @if (!open()) {
        <button type="button" class="danger" aria-controls="delete-form" [attr.aria-expanded]="false" (click)="openForm()">
          Supprimer mon compte…
        </button>
      } @else {
        <form id="delete-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="delete-password">Mot de passe</label>
            <input #password id="delete-password" type="password" formControlName="password" autocomplete="current-password"
                   [attr.aria-invalid]="showErrors() && form.controls.password.invalid"
                   [attr.aria-describedby]="showErrors() && form.controls.password.invalid ? 'delete-password-error' : null" />
            @if (showErrors() && form.controls.password.invalid) {
              <p id="delete-password-error" class="field-error">Saisissez votre mot de passe.</p>
            }
          </div>
          <div class="field">
            <label for="delete-confirm">Pour confirmer, saisissez « {{ confirmation }} »</label>
            <input id="delete-confirm" type="text" formControlName="confirmation" autocomplete="off" autocapitalize="characters"
                   spellcheck="false" [attr.aria-invalid]="showErrors() && form.controls.confirmation.invalid"
                   [attr.aria-describedby]="showErrors() && form.controls.confirmation.invalid ? 'delete-confirm-error' : null" />
            @if (showErrors() && form.controls.confirmation.invalid) {
              <p id="delete-confirm-error" class="field-error">Saisissez exactement « {{ confirmation }} ».</p>
            }
          </div>
          @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
          <div class="actions">
            <button type="submit" class="danger" [disabled]="busy()">
              {{ busy() ? 'Suppression…' : 'Supprimer définitivement mon compte' }}
            </button>
            <button type="button" (click)="cancel()" [disabled]="busy()">Annuler</button>
          </div>
        </form>
      }
    </section>
  `,
  styles: `
    .danger-zone { border-color: var(--danger-border); }
    .danger-zone h2 { color: var(--danger); }
    .danger-zone ul { padding-left: 1.2rem; }
    form { display: flex; flex-direction: column; gap: .75rem; margin-top: .75rem; max-width: 26rem; }
    button.danger { border: 1px solid var(--danger); background: var(--surface); border-radius: 4px; padding: .5rem 1rem; cursor: pointer; }
    button[type="submit"].danger { background: var(--danger-solid); color: var(--on-primary); }
  `,
})
export class DeleteAccount {
  private api = inject(CandidateService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private injector = inject(Injector);
  private fb = inject(NonNullableFormBuilder);
  private passwordInput = viewChild<ElementRef<HTMLInputElement>>('password');

  readonly confirmation = CONFIRMATION;
  open = signal(false);
  busy = signal(false);
  error = signal<string | null>(null);
  showErrors = signal(false);

  form = this.fb.group({
    password: ['', Validators.required],
    confirmation: ['', [Validators.required, Validators.pattern(`^\\s*${CONFIRMATION}\\s*$`)]],
  });

  openForm() {
    this.open.set(true);
    // focus sur le premier champ, une fois le formulaire affiché
    afterNextRender(() => this.passwordInput()?.nativeElement.focus(), { injector: this.injector });
  }

  cancel() {
    this.open.set(false);
    this.form.reset();
    this.showErrors.set(false);
    this.error.set(null);
  }

  submit() {
    this.showErrors.set(true);
    if (this.form.invalid || this.busy()) return;
    const { password, confirmation } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.api.eraseAccount(password, confirmation.trim()).subscribe({
      next: () => {
        this.auth.logout();
        this.router.navigate(['/compte-supprime']);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err));
      },
    });
  }
}
