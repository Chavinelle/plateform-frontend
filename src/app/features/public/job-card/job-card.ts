import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONTRACT_LABELS } from '../../../../core/models/candidate.models';
import { EXPERIENCE_LABELS, REMOTE_LABELS } from '../../../../core/models/company.models';
import { PublicJobSummary } from '../../../../core/models/public.models';
import { PublicService } from '../../../../core/services/public.service';
import { formatSalary, timeAgo } from '../../../../core/utils/format';
import { FavoritesService } from '../../../../core/services/favorites.service';

@Component({
  selector: 'app-job-card',
  imports: [RouterLink],
  templateUrl: './job-card.html',
  styleUrl: './job-card.scss'
})
export class JobCard {
  private api = inject(PublicService);

  job = input.required<PublicJobSummary>();
  fav = inject(FavoritesService);

  contractLabels = CONTRACT_LABELS;
  experienceLabels = EXPERIENCE_LABELS;
  remoteLabels = REMOTE_LABELS;

  logoUrl = computed(() => this.api.companyImageUrl(this.job().companyId, 'logo'));
  initials = computed(() => this.job().companyName.trim().slice(0, 2).toUpperCase());
  place = computed(() => [this.job().city, this.job().country].filter(Boolean).join(', '));
  salary = computed(() => formatSalary(this.job().salaryMin, this.job().salaryMax, this.job().salaryCurrency));
  published = computed(() => timeAgo(this.job().publishedAt));
}
