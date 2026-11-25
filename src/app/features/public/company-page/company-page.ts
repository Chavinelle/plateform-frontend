import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageResponse } from '../../../../core/models/company.models';
import { PublicCompanyProfile, PublicJobSummary } from '../../../../core/models/public.models';
import { PublicService } from '../../../../core/services/public.service';
import { JobCard } from '../job-card/job-card';

@Component({
  selector: 'app-company-page',
  imports: [RouterLink, JobCard],
  templateUrl: './company-page.html',
  styleUrl: './company-page.scss'
})
export class CompanyPage {
  private route = inject(ActivatedRoute);
  private api = inject(PublicService);

  private id = 0;
  company = signal<PublicCompanyProfile | null>(null);
  jobs = signal<PageResponse<PublicJobSummary> | null>(null);
  loading = signal(true);
  notFound = signal(false);

  logoUrl = computed(() => this.api.companyImageUrl(this.id, 'logo'));
  bannerUrl = computed(() => this.api.companyImageUrl(this.id, 'banner'));
  initials = computed(() => (this.company()?.name ?? '').trim().slice(0, 2).toUpperCase());
  details = computed(() => {
    const c = this.company();
    if (!c) return '';
    return [c.sector, c.size ? `${c.size} salariés` : null, [c.city, c.country].filter(Boolean).join(', ') || null]
      .filter(Boolean).join(' · ');
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.id = Number(pm.get('id'));
      this.company.set(null);
      this.jobs.set(null);
      this.notFound.set(false);
      this.loading.set(true);

      if (!Number.isInteger(this.id)) {
        this.loading.set(false);
        this.notFound.set(true);
        return;
      }
      this.api.getCompany(this.id).subscribe({
        next: c => {
          this.company.set(c);
          this.loading.set(false);
          this.goTo(0);
        },
        error: () => {
          this.loading.set(false);
          this.notFound.set(true);
        }
      });
    });
  }

  goTo(page: number) {
    this.api.searchJobs({ companyId: this.id, page: Math.max(page, 0), size: 6 })
      .subscribe(res => this.jobs.set(res));
  }
}
