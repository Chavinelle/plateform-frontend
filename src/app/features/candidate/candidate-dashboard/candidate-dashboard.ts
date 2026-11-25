import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CandidateDashboard as Dashboard } from '../../../../core/models/candidate-dashboard.models';
import { INTERVIEW_TYPE_LABELS } from '../../../../core/models/interview.models';
import { CandidateService } from '../../../../core/services/candidate.service';
import { CandidatePool } from '../../../../core/models/talent-pool.models';
import { TalentPoolService } from '../../../../core/services/talent-pool.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';

/** Tableau de bord du candidat : ce qui l'attend (entretiens, tests, messages) et l'avancement de ses candidatures. */
@Component({
  selector: 'app-candidate-dashboard',
  imports: [DatePipe, RouterLink],
  templateUrl: './candidate-dashboard.html',
  styleUrl: './candidate-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CandidateDashboard {
  private api = inject(CandidateService);
  private pools = inject(TalentPoolService);

  readonly typeLabels = INTERVIEW_TYPE_LABELS;
  data = signal<Dashboard | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  /** Entreprises qui conservent le profil dans leur vivier (RGPD : le candidat peut s'en retirer). */
  myPools = signal<CandidatePool[]>([]);
  confirmLeave = signal<number | null>(null);
  poolMessage = signal<string | null>(null);

  constructor() {
    this.pools.myPools().subscribe({ next: p => this.myPools.set(p), error: () => undefined });
    this.api.dashboard().subscribe({
      next: d => {
        this.loading.set(false);
        this.data.set(d);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  leave(p: CandidatePool) {
    this.pools.leave(p.entryId).subscribe({
      next: () => {
        this.myPools.update(list => list.filter(x => x.entryId !== p.entryId));
        this.confirmLeave.set(null);
        this.poolMessage.set(`Vous ne faites plus partie du vivier de ${p.companyName}.`);
      },
      error: err => this.poolMessage.set(extractErrorMessage(err))
    });
  }
}
