import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SavedJobItem } from '../../../../core/models/application.models';
import { CONTRACT_LABELS } from '../../../../core/models/candidate.models';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { PublicService } from '../../../../core/services/public.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { Loading } from '../../../shared/loading/loading';
import { EmptyState } from '../../../shared/empty-state/empty-state';

@Component({
  selector: 'app-saved-jobs',
  imports: [EmptyState, Loading, RouterLink, DatePipe],
  templateUrl: './saved-jobs.html',
  styleUrl: './saved-jobs.scss'
})
export class SavedJobs implements OnInit {
  private favorites = inject(FavoritesService);
  private publicApi = inject(PublicService);

  items = signal<SavedJobItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  busyId = signal<number | null>(null);
  contractLabels = CONTRACT_LABELS;

  ngOnInit() {
    this.favorites.list().subscribe({
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

  remove(s: SavedJobItem) {
    this.busyId.set(s.jobId);
    this.error.set(null);
    this.favorites.remove(s.jobId).subscribe({
      next: () => {
        this.busyId.set(null);
        this.items.update(list => list.filter(i => i.jobId !== s.jobId));
      },
      error: err => {
        this.busyId.set(null);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  logoUrl(s: SavedJobItem): string {
    return this.publicApi.companyImageUrl(s.companyId, 'logo');
  }

  initials(s: SavedJobItem): string {
    return s.companyName.trim().slice(0, 2).toUpperCase();
  }

  place(s: SavedJobItem): string {
    const place = [s.city, s.country].filter(Boolean).join(', ');
    return place ? ` · ${place}` : '';
  }
}
