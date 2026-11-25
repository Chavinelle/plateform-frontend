import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  COMPANY_ROLES, CompanyRole, INVITATION_STATUS_LABELS, Invitation, InvitationStatus, roleLabel
} from '../../../../../../core/models/company.models';
import { TeamService } from '../../../../../../core/services/team.service';
import { extractErrorMessage } from '../../../../../../core/utils/http-error';

@Component({
  selector: 'app-invitations-section',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './invitations-section.html',
  styleUrl: './invitations-section.scss'
})
export class InvitationsSection implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(TeamService);

  items = signal<Invitation[]>([]);
  loading = signal(true);
  sending = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  roles = COMPANY_ROLES;
  roleLabel = roleLabel;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    role: ['RECRUTEUR' as CompanyRole]
  });

  ngOnInit() {
    this.reload();
  }

  statusLabel(status: InvitationStatus): string {
    return INVITATION_STATUS_LABELS[status] ?? status;
  }

  invite() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, role } = this.form.getRawValue();
    this.send(email.trim(), role, () => this.form.reset({ email: '', role: 'RECRUTEUR' }));
  }

  inviteAgain(invitation: Invitation) {
    this.send(invitation.email, invitation.role as CompanyRole);
  }

  resend(invitation: Invitation) {
    this.message.set(null);
    this.error.set(null);
    this.api.resendInvitation(invitation.id).subscribe({
      next: () => {
        this.message.set(`Nouveau lien envoyé à ${invitation.email}. L'ancien lien ne fonctionne plus.`);
        this.reload();
      },
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  cancel(invitation: Invitation) {
    if (!confirm(`Annuler l'invitation envoyée à ${invitation.email} ?`)) return;
    this.message.set(null);
    this.error.set(null);
    this.api.cancelInvitation(invitation.id).subscribe({
      next: () => this.reload(),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  private send(email: string, role: CompanyRole, onSuccess?: () => void) {
    this.sending.set(true);
    this.message.set(null);
    this.error.set(null);
    this.api.invite(email, role).subscribe({
      next: () => {
        this.sending.set(false);
        this.message.set(`Invitation envoyée à ${email}.`);
        onSuccess?.();
        this.reload();
      },
      error: err => {
        this.sending.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  private reload() {
    this.api.listInvitations().subscribe({
      next: list => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
