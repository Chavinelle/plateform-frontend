import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import {
  AdminCompanyDetail, COMPANY_STATUS_LABELS, COMPANY_TRANSITIONS, CompanyStatus, ROLE_LABELS, USER_STATUS_LABELS
} from '../../../../core/models/admin.models';
import { AdminService } from '../../../../core/services/admin.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';

const ACTION_LABELS: Record<CompanyStatus, string> = {
  VALIDEE: 'Valider',
  REFUSEE: 'Refuser',
  SUSPENDUE: 'Suspendre',
  EN_ATTENTE: ''
};

/** Fiche d'une entreprise : informations, membres, et décision (validation, refus, suspension). */
@Component({
  selector: 'app-admin-company-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-company-detail.html',
  styleUrl: '../admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCompanyDetailPage {
  private api = inject(AdminService);
  private route = inject(ActivatedRoute);

  readonly statusLabels = COMPANY_STATUS_LABELS;
  readonly userStatusLabels = USER_STATUS_LABELS;
  readonly roleLabels = ROLE_LABELS;
  data = signal<AdminCompanyDetail | null>(null);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  busy = signal(false);
  /** Décision en cours de confirmation. */
  pending = signal<CompanyStatus | null>(null);
  reason = signal('');

  actions = computed(() => {
    const d = this.data();
    if (!d) return [];
    return COMPANY_TRANSITIONS[d.company.status].map(to => ({
      to,
      label: d.company.status === 'SUSPENDUE' && to === 'VALIDEE' ? 'Lever la suspension'
        : d.company.status === 'REFUSEE' && to === 'VALIDEE' ? 'Valider finalement' : ACTION_LABELS[to]
    }));
  });
  needsReason = computed(() => this.pending() === 'REFUSEE' || this.pending() === 'SUSPENDUE');

  private reasonInput = viewChild<ElementRef<HTMLTextAreaElement>>('reasonInput');

  constructor() {
    this.route.paramMap.pipe(
      switchMap(pm => this.api.company(Number(pm.get('id')))),
      takeUntilDestroyed()
    ).subscribe({
      next: d => this.data.set(d),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  ask(to: CompanyStatus) {
    this.pending.set(to);
    this.reason.set('');
    this.error.set(null);
    this.message.set(null);
    setTimeout(() => this.reasonInput()?.nativeElement.focus());
  }

  confirm() {
    const d = this.data();
    const to = this.pending();
    if (!d || !to) return;
    if (this.needsReason() && !this.reason().trim()) {
      this.error.set('Indiquez le motif : il sera communiqué à l’entreprise.');
      return;
    }
    this.busy.set(true);
    this.api.decide(d.company.id, to, this.reason().trim() || null).subscribe({
      next: r => {
        this.busy.set(false);
        this.pending.set(null);
        this.data.set(r);
        this.message.set(`Statut mis à jour : ${COMPANY_STATUS_LABELS[r.company.status]}. L’entreprise a été prévenue par e-mail.`);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
