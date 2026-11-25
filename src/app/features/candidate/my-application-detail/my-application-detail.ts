import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { APPLICATION_STATUS_LABELS, ApplicationDocumentView, MyApplicationDetail } from '../../../../core/models/application.models';
import { ApplicationService } from '../../../../core/services/application.service';
import { PublicService } from '../../../../core/services/public.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { MyInterviews } from '../my-interviews/my-interviews';
import { MessageThread } from '../../../shared/message-thread/message-thread';

@Component({
  selector: 'app-my-application-detail',
  imports: [RouterLink, DatePipe, MyInterviews, MessageThread],
  templateUrl: './my-application-detail.html',
  styleUrl: './my-application-detail.scss'
})
export class MyApplicationDetailPage {
  private route = inject(ActivatedRoute);
  private api = inject(ApplicationService);
  private publicApi = inject(PublicService);

  a = signal<MyApplicationDetail | null>(null);
  loading = signal(true);
  notFound = signal(false);
  docError = signal<string | null>(null);
  busy = signal(false);
  withdrawError = signal<string | null>(null);

  statusLabel = computed(() => {
    const app = this.a();
    return app ? APPLICATION_STATUS_LABELS[app.status] : '';
  });
  logoUrl = computed(() => this.publicApi.companyImageUrl(this.a()?.companyId ?? 0, 'logo'));
  initials = computed(() => (this.a()?.companyName ?? '').trim().slice(0, 2).toUpperCase());

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      const id = Number(pm.get('id'));
      this.a.set(null);
      this.notFound.set(false);
      this.loading.set(true);
      if (!Number.isInteger(id)) {
        this.loading.set(false);
        this.notFound.set(true);
        return;
      }
      this.api.get(id).subscribe({
        next: app => {
          this.a.set(app);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.notFound.set(true);
        }
      });
    });
  }

  size(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
  }

  download(applicationId: number, doc: ApplicationDocumentView) {
    this.docError.set(null);
    this.api.downloadDocument(applicationId, doc.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.originalName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => this.docError.set('Impossible de télécharger ce document.')
    });
  }


withdraw(app: MyApplicationDetail) {
  const message = `Retirer votre candidature pour « ${app.jobTitle} » ?\n\n`
    + 'Vous ne pourrez plus postuler à cette offre.';
  if (!confirm(message)) return;

  this.busy.set(true);
  this.withdrawError.set(null);
  this.api.withdraw(app.id).subscribe({
    next: updated => {
      this.busy.set(false);
      this.a.set(updated);                    // statut « Retirée », chronologie mise à jour
    },
    error: err => {
      this.busy.set(false);
      this.withdrawError.set(extractErrorMessage(err));
    }
  });
}
}
