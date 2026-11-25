import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PublicJobSummary } from '../../../core/models/public.models';
import { AuthService } from '../../../core/services/auth.service';
import { PublicService } from '../../../core/services/public.service';
import { NavIcon } from '../../layout/nav-icon/nav-icon';
import { JobCard } from '../public/job-card/job-card';
import { Loading } from '../../shared/loading/loading';
import { EmptyState } from '../../shared/empty-state/empty-state';

@Component({
  selector: 'app-home',
  imports: [EmptyState, Loading, ReactiveFormsModule, RouterLink, JobCard, NavIcon],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(PublicService);
  private router = inject(Router);
  auth = inject(AuthService);

  jobs = signal<PublicJobSummary[]>([]);
  loading = signal(true);
  error = signal(false);

  form = this.fb.nonNullable.group({ q: [''], city: [''] });

  ngOnInit() {
    this.api.searchJobs({ size: 6 }).subscribe({
      next: page => {
        this.jobs.set(page.content);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      }
    });
  }

  search() {
    const { q, city } = this.form.getRawValue();
    const queryParams: Record<string, string> = {};
    if (q.trim()) queryParams['q'] = q.trim();
    if (city.trim()) queryParams['city'] = city.trim();
    this.router.navigate(['/offres'], { queryParams });
  }
}
