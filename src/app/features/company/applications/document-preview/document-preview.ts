import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, of, switchMap, tap } from 'rxjs';
import { ApplicationDocumentView } from '../../../../../core/models/application.models';
import { RecruiterApplicationService } from '../../../../../core/services/recruiter-application.service';
import { saveBlob } from '../../../../../core/utils/download';
import { formatSize } from '../../../../../core/utils/format';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

/**
 * Aperçu d'un document joint à une candidature.
 * Une balise <iframe> n'envoie pas le jeton : le fichier est récupéré en "blob" puis affiché via une URL locale.
 */
@Component({
  selector: 'app-document-preview',
  templateUrl: './document-preview.html',
  styleUrl: './document-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentPreview {
  private api = inject(RecruiterApplicationService);
  private sanitizer = inject(DomSanitizer);

  applicationId = input.required<number>();
  document = input.required<ApplicationDocumentView>();
  /** Nom affiché dans le titre de l'iframe (lecteurs d'écran). */
  label = input('Document');

  url = signal<SafeResourceUrl | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  unsupported = signal(false);
  size = computed(() => formatSize(this.document().sizeBytes));

  private blob: Blob | null = null;
  private objectUrl: string | null = null;

  constructor() {
    const target = computed(() => ({ applicationId: this.applicationId(), documentId: this.document().id }));

    // un nouveau document annule le téléchargement précédent
    toObservable(target).pipe(
      tap(() => this.reset()),
      switchMap(t => {
        this.loading.set(true);
        return this.api.downloadDocument(t.applicationId, t.documentId, true).pipe(catchError(err => {
          this.error.set(extractErrorMessage(err));
          return of(null);
        }));
      }),
      takeUntilDestroyed()
    ).subscribe(blob => {
      this.loading.set(false);
      if (!blob) return;
      this.blob = blob;
      if (blob.type === 'application/pdf') {
        this.objectUrl = URL.createObjectURL(blob);
        // URL locale (blob:) créée à partir d'un fichier renvoyé par notre propre API
        this.url.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
      } else {
        this.unsupported.set(true);   // DOCX : le navigateur ne sait pas l'afficher
      }
    });

    inject(DestroyRef).onDestroy(() => this.revoke());
  }

  download() {
    const doc = this.document();
    if (this.blob) {
      saveBlob(this.blob, doc.originalName);
      return;
    }
    this.api.downloadDocument(this.applicationId(), doc.id).subscribe({
      next: blob => saveBlob(blob, doc.originalName),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  private reset() {
    this.revoke();
    this.blob = null;
    this.url.set(null);
    this.error.set(null);
    this.unsupported.set(false);
  }

  private revoke() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
