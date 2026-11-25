import { DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ReportJob } from '../report-job/report-job';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CONTRACT_LABELS } from '../../../../core/models/candidate.models';
import { EXPERIENCE_LABELS, REMOTE_LABELS } from '../../../../core/models/company.models';
import { PublicJobDetail } from '../../../../core/models/public.models';
import { AuthService } from '../../../../core/services/auth.service';
import { PublicService } from '../../../../core/services/public.service';
import { formatSalary, timeAgo } from '../../../../core/utils/format';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { Loading } from '../../../shared/loading/loading';

@Component({
  selector: 'app-job-detail',
  imports: [Loading, RouterLink, DatePipe, ReportJob],
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.scss'
})
export class JobDetail implements OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(PublicService);
  private title = inject(Title);
  auth = inject(AuthService);
  fav = inject(FavoritesService);

  private previousTitle = this.title.getTitle();

  job = signal<PublicJobDetail | null>(null);
  loading = signal(true);
  notFound = signal(false);
  copied = signal(false);

  contractLabels = CONTRACT_LABELS;
  experienceLabels = EXPERIENCE_LABELS;
  remoteLabels = REMOTE_LABELS;

  canApply = computed(() => this.auth.user()?.role === 'CANDIDAT');
  isCompany = computed(() => ['ADMIN_ENTREPRISE', 'RECRUTEUR', 'MANAGER'].includes(this.auth.user()?.role ?? ''));
  logoUrl = computed(() => this.api.companyImageUrl(this.job()?.company.id ?? 0, 'logo'));
  initials = computed(() => (this.job()?.company.name ?? '').trim().slice(0, 2).toUpperCase());
  place = computed(() => [this.job()?.city, this.job()?.country].filter(Boolean).join(', '));
  salary = computed(() => {
    const j = this.job();
    return j ? formatSalary(j.salaryMin, j.salaryMax, j.salaryCurrency) : null;
  });
  published = computed(() => {
    const j = this.job();
    return j ? timeAgo(j.publishedAt) : '';
  });

  private shareUrl = computed(() => `${window.location.origin}/offres/${this.job()?.id ?? ''}`);
  linkedinUrl = computed(() => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.shareUrl())}`);
  facebookUrl = computed(() => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareUrl())}`);
  xUrl = computed(() => `https://twitter.com/intent/tweet?url=${encodeURIComponent(this.shareUrl())}&text=${encodeURIComponent(this.job()?.title ?? '')}`);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      const id = Number(pm.get('id'));
      this.job.set(null);
      this.notFound.set(false);
      this.loading.set(true);

      if (!Number.isInteger(id)) {
        this.loading.set(false);
        this.notFound.set(true);
        return;
      }
      this.api.getJob(id).subscribe({
        next: job => {
          this.job.set(job);
          this.loading.set(false);
          this.title.setTitle(`${job.title} — ${job.company.name}`);
        },
        error: () => {
          this.loading.set(false);
          this.notFound.set(true);
        }
      });
    });
  }

  copyLink() {
    navigator.clipboard.writeText(this.shareUrl()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    });
  }

  ngOnDestroy() {
    this.title.setTitle(this.previousTitle);
  }
}
